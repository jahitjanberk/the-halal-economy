/**
 * UI translations. English is the source of truth: the default copy lives in
 * index.html on [data-i18n] elements, is captured on boot, and is restored
 * whenever a key is missing from a translation.
 */
import { state, writeURL } from './state.js';

export const i18n = {
  en:{},
  ar:{brand:'الاقتصاد الحلال','nav.map':'الخريطة','nav.sectors':'القطاعات','nav.growth':'النمو','nav.finance':'التمويل','aria.perspective':'المنظور: يعيد صياغة التعليقات بحسب دورك','aria.language':'اللغة','aria.perspectiveGroup':'اختر منظورك','aria.searchCountry':'ابحث عن دولة','aria.cmp1':'الدولة الأولى للمقارنة','aria.cmp2':'الدولة الثانية للمقارنة','aria.cmp3':'الدولة الثالثة للمقارنة، اختياري','aria.dealEd':'تصفية الصفقات حسب إصدار التقرير','aria.dealScope':'تصفية الصفقات حسب النطاق','aria.dealQ':'البحث في الصفقات','nav.gap':'الفجوة','nav.countries':'الدول','nav.compare':'مقارنة','nav.trade':'التجارة','nav.invest':'الصفقات','nav.business':'الدخول','nav.takeaways':'الخلاصة','view.dashboard':'لوحة البيانات','view.story':'القصة','tour.start':'جولة إرشادية',copylink:'نسخ رابط هذا العرض',langnote:'تُرجمت الواجهة؛ التحليلات المطوّلة ونص القصة ما زالت بالإنجليزية حاليًا.','hero.h1':'اقتصاد بقيمة 9 تريليونات دولار، مرسوم قطاعًا بقطاع ودولةً بدولة.','hero.lede':'أنفق المستهلكون المسلمون 2.6 تريليون دولار في 2024 على الأغذية الحلال والأزياء والسفر والإعلام والأدوية ومستحضرات التجميل. ويحتفظ التمويل الإسلامي بستة تريليونات دولار أخرى من الأصول. تُظهر هذه اللوحة أين تتركز هذه الأموال، وسرعة نمو كل جزء، وما يعنيه ذلك بحسب من أنت.','aud.label':'أنظر إلى هذا بصفتي:','aud.public':'الجمهور العام','aud.investor':'مستثمر','aud.policy':'صانع سياسات','aud.business':'صاحب عمل','kpi.spend':'إنفاق المستهلكين المسلمين عبر ستة قطاعات حلال، 2024','kpi.fin':'أصول التمويل الإسلامي، 2024','kpi.growth':'النمو السنوي المتوقع في إنفاق المستهلكين، 2024–2029','kpi.deals':'صفقات الاستثمار في آخر سنة تقرير','map.h2':'حيث يعيش الاقتصاد الحلال','sectors.h2':'ستة قطاعات بسرعات مختلفة جدًا','layer.pop':'عدد المسلمين','layer.giei':'درجة المنظومة','layer.fin':'حصة التمويل الإسلامي'},
  id:{brand:'Ekonomi Halal','nav.map':'Peta','nav.sectors':'Sektor','nav.growth':'Pertumbuhan','nav.finance':'Keuangan','aria.perspective':'Perspektif: menyesuaikan ulasan sesuai peran Anda','aria.language':'Bahasa','aria.perspectiveGroup':'Pilih perspektif Anda','aria.searchCountry':'Cari negara','aria.cmp1':'Negara pertama untuk dibandingkan','aria.cmp2':'Negara kedua untuk dibandingkan','aria.cmp3':'Negara ketiga untuk dibandingkan, opsional','aria.dealEd':'Saring transaksi menurut edisi laporan','aria.dealScope':'Saring transaksi menurut cakupan','aria.dealQ':'Cari transaksi','nav.gap':'Kesenjangan','nav.countries':'Negara','nav.compare':'Bandingkan','nav.trade':'Perdagangan','nav.invest':'Transaksi','nav.business':'Masuk pasar','nav.takeaways':'Kesimpulan','view.dashboard':'Dasbor','view.story':'Cerita','tour.start':'Ikuti tur',copylink:'Salin tautan tampilan ini',langnote:'Antarmuka telah diterjemahkan; analisis panjang dan teks cerita masih dalam bahasa Inggris.','hero.h1':'Ekonomi senilai $9 triliun, dipetakan sektor demi sektor dan negara demi negara.','hero.lede':'Konsumen Muslim membelanjakan $2,6 triliun pada 2024 untuk makanan halal, busana, perjalanan, media, obat-obatan, dan kosmetik. Keuangan syariah menyimpan $6 triliun aset lainnya. Dasbor ini menunjukkan di mana uang itu berada, seberapa cepat tiap bagian tumbuh, dan artinya bagi Anda.','aud.label':'Saya melihat ini sebagai:','aud.public':'Masyarakat umum','aud.investor':'Investor','aud.policy':'Pembuat kebijakan','aud.business':'Pemilik usaha','kpi.spend':'Belanja konsumen Muslim di enam sektor halal, 2024','kpi.fin':'Aset keuangan syariah, 2024','kpi.growth':'Proyeksi pertumbuhan tahunan belanja konsumen, 2024–29','kpi.deals':'Transaksi investasi pada tahun pelaporan terakhir','map.h2':'Di mana ekonomi halal berada','sectors.h2':'Enam sektor, kecepatan yang sangat berbeda','layer.pop':'Populasi Muslim','layer.giei':'Skor ekosistem','layer.fin':'Pangsa keuangan syariah'},
  ms:{brand:'Ekonomi Halal','nav.map':'Peta','nav.sectors':'Sektor','nav.growth':'Pertumbuhan','nav.finance':'Kewangan','aria.perspective':'Perspektif: merangka semula ulasan mengikut peranan anda','aria.language':'Bahasa','aria.perspectiveGroup':'Pilih perspektif anda','aria.searchCountry':'Cari negara','aria.cmp1':'Negara pertama untuk dibandingkan','aria.cmp2':'Negara kedua untuk dibandingkan','aria.cmp3':'Negara ketiga untuk dibandingkan, pilihan','aria.dealEd':'Tapis urus niaga mengikut edisi laporan','aria.dealScope':'Tapis urus niaga mengikut skop','aria.dealQ':'Cari urus niaga','nav.gap':'Jurang','nav.countries':'Negara','nav.compare':'Banding','nav.trade':'Perdagangan','nav.invest':'Urus niaga','nav.business':'Kemasukan','nav.takeaways':'Rumusan','view.dashboard':'Papan pemuka','view.story':'Cerita','tour.start':'Ikut lawatan',copylink:'Salin pautan paparan ini',langnote:'Antara muka telah diterjemahkan; analisis panjang dan teks cerita masih dalam bahasa Inggeris.','hero.h1':'Ekonomi bernilai $9 trilion, dipetakan sektor demi sektor dan negara demi negara.','hero.lede':'Pengguna Muslim membelanjakan $2.6 trilion pada 2024 untuk makanan halal, fesyen, pelancongan, media, ubat-ubatan dan kosmetik. Kewangan Islam memegang $6 trilion aset lagi. Papan pemuka ini menunjukkan di mana wang itu berada, seberapa pantas setiap bahagian berkembang, dan maksudnya untuk anda.','aud.label':'Saya melihat ini sebagai:','aud.public':'Orang awam','aud.investor':'Pelabur','aud.policy':'Penggubal dasar','aud.business':'Pemilik perniagaan','kpi.spend':'Perbelanjaan pengguna Muslim merentas enam sektor halal, 2024','kpi.fin':'Aset kewangan Islam, 2024','kpi.growth':'Unjuran pertumbuhan tahunan perbelanjaan pengguna, 2024–29','kpi.deals':'Urus niaga pelaburan pada tahun pelaporan terkini','map.h2':'Di mana ekonomi halal berada','sectors.h2':'Enam sektor, kelajuan yang sangat berbeza','layer.pop':'Penduduk Muslim','layer.giei':'Skor ekosistem','layer.fin':'Bahagian kewangan Islam'}
};

const i18nDefaults = {};
const ariaDefaults = {};

/**
 * Snapshot the English copy already in the markup. Call once, before setLang.
 *
 * Two sweeps, because a control can be named by text or by an attribute. The
 * pickers and filters have no visible label at all — their whole name is an
 * `aria-label` — so leaving attributes untranslated left a screen-reader user
 * on the Arabic page hearing the interface in English.
 */
export function captureDefaults(){
  document.querySelectorAll('[data-i18n]').forEach(e => { i18nDefaults[e.dataset.i18n] = e.innerHTML; });
  document.querySelectorAll('[data-i18n-aria]').forEach(e => { ariaDefaults[e.dataset.i18nAria] = e.getAttribute('aria-label'); });
}

export function setLang(l){
  state.lang = l;
  const d = i18n[l] || {};
  document.querySelectorAll('[data-i18n]').forEach(e => {
    e.innerHTML = d[e.dataset.i18n] || i18nDefaults[e.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(e => {
    e.setAttribute('aria-label', d[e.dataset.i18nAria] || ariaDefaults[e.dataset.i18nAria]);
  });
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('lang').value = l;
  writeURL();
}

export function initLanguageSwitcher(){
  document.getElementById('lang').addEventListener('change', e => setLang(e.target.value));
}
