const {randomInt}=require('node:crypto');
const given=['Бат|Bat','Наран|Naran','Саруул|Saruul','Тэмүүлэн|Temuulen','Мөнх|Munkh','Ариун|Ariun','Болор|Bolor','Уянга|Uyanga','Энх|Enkh','Хулан|Khulan'];
const family=['Эрдэнэ|Erdene','Туяа|Tuya','Баяр|Bayar','Сүрэн|Suren','Дорж|Dorj','Чулуун|Chuluun','Алтан|Altan','Од|Od','Гэрэл|Gerel','Сайхан|Saikhan','Төгс|Tugs','Билэг|Bileg','Дөл|Dul','Заяа|Zayaa','Хишиг|Khishig','Цэцэг|Tsetseg','Тэнгэр|Tenger','Сондор|Sondor','Далай|Dalai','Оргил|Orgil'];
const short=['Batuka','Batuna','Naraa','Saraa','Temka','Muuji','Ari','Bolo','Uyaa','Khula'];
function roster(portfolio,categories,bios) {
 if(!portfolio?.trim() || !Array.isArray(categories) || !categories.some(c=>c.trim()) || !bios.length) throw Error('Бизнесийн багц болон ангиллаа оруулна уу.');
 return given.flatMap((first,i)=>family.map((last,j)=>{
  const [a,b]=first.split('|'),[c,d]=last.split('|');
  const variants=[a+' '+c,b+' '+d,a+' '+d,b+' '+c,j===4?short[i]:short[i]+' '+d];
  return {name:variants[j%5],portfolio:portfolio.trim(),categories,bio:bios[randomInt(bios.length)]};
 }));
}
module.exports={roster};
