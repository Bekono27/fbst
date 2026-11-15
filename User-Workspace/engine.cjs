const path = require('node:path');
const { randomInt } = require('node:crypto');
const { pageIdFromURL } = require('./database.cjs');
class Engine {
  constructor(store, directory, chromium) {
    this.store=store; this.directory=directory; this.chromium=chromium;
    this.context=null; this.page=null; this.busy=false; this.active=null;
  }
  async browser() {
    if (this.context) return this.context;
    const chromium = this.chromium || require('playwright').chromium;
    this.context = await chromium.launchPersistentContext(path.join(this.directory,'browser'), {headless:false,viewport:{width:1280,height:850}});
    this.context.on('close',()=>{this.context=null;this.page=null;});
    this.page = this.context.pages()[0] || await this.context.newPage();
    this.page.setDefaultTimeout(12000);
    await this.page.goto('https://business.facebook.com/',{waitUntil:'domcontentloaded'});
    return this.context;
  }
  async open() {
    if(this.busy) throw Error('Одоогийн ажиллагаа дуусахыг хүлээнэ үү.');
    this.busy=true;
    try { await this.browser(); await this.page.bringToFront(); }
    finally { this.busy=false; }
  }
  async guard() {
    const url = this.page.url();
    const text = await this.page.locator('body').innerText();
    if (/login|checkpoint|captcha/.test(url) || /confirm you're human|verify you are human|temporarily blocked/i.test(text)) {
      throw Error('Meta хөтөч дээр нэвтрэлт эсвэл баталгаажуулалтаа гүйцээнэ үү.');
    }
  }
  async run(id) {
    if(this.busy) throw Error('Өөр ажиллагаа явагдаж байна.');
    const row = this.store.get(id);
    if(!row || !['draft','failed'].includes(row.status) || row.page_id) throw Error('Энэ бүртгэлийг дахин үүсгэх боломжгүй. Төлөвийг шалгана уу.');
    this.busy=true; this.active=id;
    this.store.state(id,'opening','Meta хөтөч нээж байна.');
    this.task=this.create(row).finally(()=>{this.busy=false;this.active=null;});
    return this.store.get(id);
  }
  async create(row) {
    let submitted=false;
    try {
      await this.browser(); await this.page.bringToFront(); await this.guard();
      // The selected portfolio must be visible before any form is changed.
      const portfolio = this.page.getByText(row.portfolio,{exact:true}).filter({visible:true});
      await portfolio.first().waitFor({state:'visible'});
      if (!(await this.page.getByRole('dialog').count())) {
        await this.page.getByRole('button',{name:/Manage Pages|Хуудсуудыг удирдах/i}).click();
        await this.page.getByText(/Create a new Facebook Page|Шинэ Facebook хуудас үүсгэх/i).click();
      }
      const dialog = this.page.getByRole('dialog');
      const scope = await dialog.count() === 1 ? dialog : this.page;
      this.store.state(row.id,'filling','Нэр, ангилал, танилцуулгыг бөглөж байна.');
      await scope.getByLabel(/Page name|Хуудасны нэр/i).fill(row.name);
      const category = row.categories[randomInt(row.categories.length)];
      const categoryField = scope.getByRole('combobox');
      if (await categoryField.count() === 1) await categoryField.fill(category);
      else await scope.getByLabel(/Category|Ангилал/i).fill(category);
      await this.page.getByRole('option',{name:category,exact:true}).click();
      await scope.getByLabel(/Bio|Танилцуулга/i).fill(row.bio);
      this.store.state(row.id,'filling','Мэдээлэл бөглөгдлөө.',{chosen_category:category});
      await scope.getByRole('button',{name:/^Next$|^Дараах$/}).click();
      await this.guard();
      // Terms checkboxes remain with the person operating the local browser.
      if (await scope.getByRole('checkbox').count()) {
        const checks = await scope.getByRole('checkbox').all();
        for(const check of checks) if (!(await check.isChecked())) throw Error('Meta нөхцөлийг хөтөч дээр уншиж баталгаажуулаад дахин үргэлжлүүлнэ үү.');
      }
      const create = scope.getByRole('button',{name:/^Create Page$|^Create Facebook Page$|^Хуудас үүсгэх$/});
      await create.waitFor({state:'visible'});
      this.store.state(row.id,'submitting','Үүсгэх хүсэлтийг илгээж байна. Давтан ажиллуулахгүй.');
      submitted=true;
      await create.click();
      await this.page.getByRole('button',{name:/^Done$|^Дуусгах$/})
        .or(this.page.getByRole('link',{name:row.name,exact:true}))
        .or(this.page.getByRole('heading',{name:row.name,exact:true}))
        .first().waitFor({state:'visible',timeout:30000});
      await this.collect(row.id);
    } catch(error) {
      this.store.state(row.id,submitted?'review':'failed',submitted
        ? 'Үр дүнг шалгах шаардлагатай. Meta дээр хуудас үүссэн эсэхийг шалгаж дугаарыг татна уу.'
        : 'Бөглөх алхам дууссангүй. Meta дээр сонгосон бизнесийн багц, нэвтрэлт болон маягтыг шалгана уу.');
    }
  }
  async collect(id) {
    await this.guard();
    const row=this.store.get(id);
    // Only a URL paired with this Page's exact visible name is eligible.
    const links = this.page.getByRole('link',{name:row.name,exact:true});
    for (const link of await links.all()) {
      const raw = await link.getAttribute('href');
      if(!raw) continue;
      const url = new URL(raw,this.page.url()).href;
      const pageId=pageIdFromURL(url);
      if(pageId) return this.store.capture(id,pageId,url);
    }
    const done=this.page.getByRole('button',{name:/^Done$|^Дуусгах$/});
    if(await done.isVisible()) await done.click();
    const heading=this.page.getByRole('heading',{name:row.name,exact:true});
    if(await heading.count()) {
      const pageId=pageIdFromURL(this.page.url());
      if(pageId) return this.store.capture(id,pageId,this.page.url());
    }
    return this.store.state(id,'review','Хуудасны дугаар хараахан олдсонгүй. Meta дээр хуудсаа нээгээд дугаар татах товчийг дарна уу.');
  }
  async capture(id) {
    if(this.busy) throw Error('Ажиллагаа дуусахыг хүлээнэ үү.');
    if(!this.page || !this.store.get(id)) throw Error('Эхлээд Meta хөтөч болон бүртгэлээ нээнэ үү.');
    this.busy=true;
    try { return await this.collect(id); } finally {this.busy=false;}
  }
}
module.exports={Engine};
