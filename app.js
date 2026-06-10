// =============================================================
// World Cup 2026 Predictor — Application Logic (Ranking style)
// =============================================================

function configIsValid() {
  return !!SUPABASE_URL && !SUPABASE_URL.includes("PASTE_YOUR") && !!SUPABASE_KEY && !SUPABASE_KEY.includes("PASTE_YOUR");
}

const sb = (typeof SUPABASE_URL !== "undefined" && !SUPABASE_URL.includes("PASTE"))
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const GROUPS = {
  A:["Mexico","South Africa","South Korea","Czechia"],
  B:["Canada","Bosnia & Herzegovina","Qatar","Switzerland"],
  C:["Brazil","Morocco","Haiti","Scotland"],
  D:["USA","Paraguay","Australia","Turkey"],
  E:["Germany","Curaçao","Ivory Coast","Ecuador"],
  F:["Netherlands","Japan","Sweden","Tunisia"],
  G:["Belgium","Egypt","Iran","New Zealand"],
  H:["Spain","Cape Verde","Saudi Arabia","Uruguay"],
  I:["France","Senegal","Iraq","Norway"],
  J:["Argentina","Algeria","Austria","Jordan"],
  K:["Portugal","DR Congo","Uzbekistan","Colombia"],
  L:["England","Croatia","Ghana","Panama"]
};
const ALL_TEAMS = Object.values(GROUPS).flat();
const LOCK_TIME = new Date(LOCK_TIME_ISO).getTime();
const KO_PTS = {r32:2, r16:3, qf:4, sf:5, bronze:4, final:20};
const GROUP_POS_PTS = [3, 2, 1, 0];
const THIRD_ADV_PT = 1;
const SCORER_PT = 8;

// FIFA Annex C: 495-row table that maps the 8 advancing-thirds combination
// to specific R32 slots. Key = sorted 8-letter string of advancing groups.
// Value = 8-letter string of group letters whose third-place team faces:
//   [0]=1A (m79), [1]=1B (m85), [2]=1D (m81), [3]=1E (m74),
//   [4]=1G (m82), [5]=1I (m77), [6]=1K (m87), [7]=1L (m80)
const ANNEX_C = {
  "ABCDEFGH":"HGBCAFDE","ABCDEFGI":"CGBDAFEI","ABCDEFGJ":"CGBDAFEJ","ABCDEFGK":"CGBDAFEK","ABCDEFGL":"CGBDAFLE","ABCDEFHI":"HEBCAFDI","ABCDEFHJ":"HJBCAFDE","ABCDEFHK":"HEBCAFDK","ABCDEFHL":"HFBCADLE","ABCDEFIJ":"CJBDAFEI",
  "ABCDEFIK":"CEBDAFIK","ABCDEFIL":"CEBDAFLI","ABCDEFJK":"CJBDAFEK","ABCDEFJL":"CJBDAFLE","ABCDEFKL":"CEBDAFLK","ABCDEGHI":"HGBCADEI","ABCDEGHJ":"HGBCADEJ","ABCDEGHK":"HGBCADEK","ABCDEGHL":"HGBCADLE","ABCDEGIJ":"EGBCADIJ",
  "ABCDEGIK":"EGBCADIK","ABCDEGIL":"EGBCADLI","ABCDEGJK":"EGBCADJK","ABCDEGJL":"EGBCADLJ","ABCDEGKL":"EGBCADLK","ABCDEHIJ":"HJBCADEI","ABCDEHIK":"HEBCADIK","ABCDEHIL":"HEBCADLI","ABCDEHJK":"HJBCADEK","ABCDEHJL":"HJBCADLE",
  "ABCDEHKL":"HEBCADLK","ABCDEIJK":"EJBCADIK","ABCDEIJL":"EJBCADLI","ABCDEIKL":"EIBCADLK","ABCDEJKL":"EJBCADLK","ABCDFGHI":"HGBCAFDI","ABCDFGHJ":"HGBCAFDJ","ABCDFGHK":"HGBCAFDK","ABCDFGHL":"CGBDAFLH","ABCDFGIJ":"CGBDAFIJ",
  "ABCDFGIK":"CGBDAFIK","ABCDFGIL":"CGBDAFLI","ABCDFGJK":"CGBDAFJK","ABCDFGJL":"CGBDAFLJ","ABCDFGKL":"CGBDAFLK","ABCDFHIJ":"HJBCAFDI","ABCDFHIK":"HFBCADIK","ABCDFHIL":"HFBCADLI","ABCDFHJK":"HJBCAFDK","ABCDFHJL":"CJBDAFLH",
  "ABCDFHKL":"HFBCADLK","ABCDFIJK":"CJBDAFIK","ABCDFIJL":"CJBDAFLI","ABCDFIKL":"CIBDAFLK","ABCDFJKL":"CJBDAFLK","ABCDGHIJ":"HGBCADIJ","ABCDGHIK":"HGBCADIK","ABCDGHIL":"HGBCADLI","ABCDGHJK":"HGBCADJK","ABCDGHJL":"HGBCADLJ",
  "ABCDGHKL":"HGBCADLK","ABCDGIJK":"CJBDAGIK","ABCDGIJL":"CJBDAGLI","ABCDGIKL":"IGBCADLK","ABCDGJKL":"CJBDAGLK","ABCDHIJK":"HJBCADIK","ABCDHIJL":"HJBCADLI","ABCDHIKL":"HIBCADLK","ABCDHJKL":"HJBCADLK","ABCDIJKL":"IJBCADLK",
  "ABCEFGHI":"HGBCAFEI","ABCEFGHJ":"HGBCAFEJ","ABCEFGHK":"HGBCAFEK","ABCEFGHL":"HGBCAFLE","ABCEFGIJ":"EGBCAFIJ","ABCEFGIK":"EGBCAFIK","ABCEFGIL":"EGBCAFLI","ABCEFGJK":"EGBCAFJK","ABCEFGJL":"EGBCAFLJ","ABCEFGKL":"EGBCAFLK",
  "ABCEFHIJ":"HJBCAFEI","ABCEFHIK":"HEBCAFIK","ABCEFHIL":"HEBCAFLI","ABCEFHJK":"HJBCAFEK","ABCEFHJL":"HJBCAFLE","ABCEFHKL":"HEBCAFLK","ABCEFIJK":"EJBCAFIK","ABCEFIJL":"EJBCAFLI","ABCEFIKL":"EIBCAFLK","ABCEFJKL":"EJBCAFLK",
  "ABCEGHIJ":"HJBCAGEI","ABCEGHIK":"EGBCAHIK","ABCEGHIL":"EGBCAHLI","ABCEGHJK":"HJBCAGEK","ABCEGHJL":"HJBCAGLE","ABCEGHKL":"EGBCAHLK","ABCEGIJK":"EJBCAGIK","ABCEGIJL":"EJBCAGLI","ABCEGIKL":"EGBAICLK","ABCEGJKL":"EJBCAGLK",
  "ABCEHIJK":"EJBCAHIK","ABCEHIJL":"EJBCAHLI","ABCEHIKL":"EIBCAHLK","ABCEHJKL":"EJBCAHLK","ABCEIJKL":"EJBAICLK","ABCFGHIJ":"HGBCAFIJ","ABCFGHIK":"HGBCAFIK","ABCFGHIL":"HGBCAFLI","ABCFGHJK":"HGBCAFJK","ABCFGHJL":"HGBCAFLJ",
  "ABCFGHKL":"HGBCAFLK","ABCFGIJK":"CJBFAGIK","ABCFGIJL":"CJBFAGLI","ABCFGIKL":"IGBCAFLK","ABCFGJKL":"CJBFAGLK","ABCFHIJK":"HJBCAFIK","ABCFHIJL":"HJBCAFLI","ABCFHIKL":"HIBCAFLK","ABCFHJKL":"HJBCAFLK","ABCFIJKL":"IJBCAFLK",
  "ABCGHIJK":"HJBCAGIK","ABCGHIJL":"HJBCAGLI","ABCGHIKL":"IGBCAHLK","ABCGHJKL":"HJBCAGLK","ABCGIJKL":"IJBCAGLK","ABCHIJKL":"IJBCAHLK","ABDEFGHI":"HGBDAFEI","ABDEFGHJ":"HGBDAFEJ","ABDEFGHK":"HGBDAFEK","ABDEFGHL":"HGBDAFLE",
  "ABDEFGIJ":"EGBDAFIJ","ABDEFGIK":"EGBDAFIK","ABDEFGIL":"EGBDAFLI","ABDEFGJK":"EGBDAFJK","ABDEFGJL":"EGBDAFLJ","ABDEFGKL":"EGBDAFLK","ABDEFHIJ":"HJBDAFEI","ABDEFHIK":"HEBDAFIK","ABDEFHIL":"HEBDAFLI","ABDEFHJK":"HJBDAFEK",
  "ABDEFHJL":"HJBDAFLE","ABDEFHKL":"HEBDAFLK","ABDEFIJK":"EJBDAFIK","ABDEFIJL":"EJBDAFLI","ABDEFIKL":"EIBDAFLK","ABDEFJKL":"EJBDAFLK","ABDEGHIJ":"HJBDAGEI","ABDEGHIK":"EGBDAHIK","ABDEGHIL":"EGBDAHLI","ABDEGHJK":"HJBDAGEK",
  "ABDEGHJL":"HJBDAGLE","ABDEGHKL":"EGBDAHLK","ABDEGIJK":"EJBDAGIK","ABDEGIJL":"EJBDAGLI","ABDEGIKL":"EGBAIDLK","ABDEGJKL":"EJBDAGLK","ABDEHIJK":"EJBDAHIK","ABDEHIJL":"EJBDAHLI","ABDEHIKL":"EIBDAHLK","ABDEHJKL":"EJBDAHLK",
  "ABDEIJKL":"EJBAIDLK","ABDFGHIJ":"HGBDAFIJ","ABDFGHIK":"HGBDAFIK","ABDFGHIL":"HGBDAFLI","ABDFGHJK":"HGBDAFJK","ABDFGHJL":"HGBDAFLJ","ABDFGHKL":"HGBDAFLK","ABDFGIJK":"FJBDAGIK","ABDFGIJL":"FJBDAGLI","ABDFGIKL":"IGBDAFLK",
  "ABDFGJKL":"FJBDAGLK","ABDFHIJK":"HJBDAFIK","ABDFHIJL":"HJBDAFLI","ABDFHIKL":"HIBDAFLK","ABDFHJKL":"HJBDAFLK","ABDFIJKL":"IJBDAFLK","ABDGHIJK":"HJBDAGIK","ABDGHIJL":"HJBDAGLI","ABDGHIKL":"IGBDAHLK","ABDGHJKL":"HJBDAGLK",
  "ABDGIJKL":"IJBDAGLK","ABDHIJKL":"IJBDAHLK","ABEFGHIJ":"HJBFAGEI","ABEFGHIK":"EGBFAHIK","ABEFGHIL":"EGBFAHLI","ABEFGHJK":"HJBFAGEK","ABEFGHJL":"HJBFAGLE","ABEFGHKL":"EGBFAHLK","ABEFGIJK":"EJBFAGIK","ABEFGIJL":"EJBFAGLI",
  "ABEFGIKL":"EGBAIFLK","ABEFGJKL":"EJBFAGLK","ABEFHIJK":"EJBFAHIK","ABEFHIJL":"EJBFAHLI","ABEFHIKL":"EIBFAHLK","ABEFHJKL":"EJBFAHLK","ABEFIJKL":"EJBAIFLK","ABEGHIJK":"EJBAHGIK","ABEGHIJL":"EJBAHGLI","ABEGHIKL":"EGBAIHLK",
  "ABEGHJKL":"EJBAHGLK","ABEGIJKL":"EJBAIGLK","ABEHIJKL":"EJBAIHLK","ABFGHIJK":"HJBFAGIK","ABFGHIJL":"HJBFAGLI","ABFGHIKL":"HGBAIFLK","ABFGHJKL":"HJBFAGLK","ABFGIJKL":"IJBFAGLK","ABFHIJKL":"HJBAIFLK","ABGHIJKL":"HJBAIGLK",
  "ACDEFGHI":"HGECAFDI","ACDEFGHJ":"HGJCAFDE","ACDEFGHK":"HGECAFDK","ACDEFGHL":"HGFCADLE","ACDEFGIJ":"CGJDAFEI","ACDEFGIK":"CGEDAFIK","ACDEFGIL":"CGEDAFLI","ACDEFGJK":"CGJDAFEK","ACDEFGJL":"CGJDAFLE","ACDEFGKL":"CGEDAFLK",
  "ACDEFHIJ":"HJECAFDI","ACDEFHIK":"HEFCADIK","ACDEFHIL":"HEFCADLI","ACDEFHJK":"HJECAFDK","ACDEFHJL":"HJFCADLE","ACDEFHKL":"HEFCADLK","ACDEFIJK":"CJEDAFIK","ACDEFIJL":"CJEDAFLI","ACDEFIKL":"CEIDAFLK","ACDEFJKL":"CJEDAFLK",
  "ACDEGHIJ":"HGJCADEI","ACDEGHIK":"HGECADIK","ACDEGHIL":"HGECADLI","ACDEGHJK":"HGJCADEK","ACDEGHJL":"HGJCADLE","ACDEGHKL":"HGECADLK","ACDEGIJK":"EGJCADIK","ACDEGIJL":"EGJCADLI","ACDEGIKL":"EGICADLK","ACDEGJKL":"EGJCADLK",
  "ACDEHIJK":"HJECADIK","ACDEHIJL":"HJECADLI","ACDEHIKL":"HEICADLK","ACDEHJKL":"HJECADLK","ACDEIJKL":"EJICADLK","ACDFGHIJ":"HGJCAFDI","ACDFGHIK":"HGFCADIK","ACDFGHIL":"HGFCADLI","ACDFGHJK":"HGJCAFDK","ACDFGHJL":"CGJDAFLH",
  "ACDFGHKL":"HGFCADLK","ACDFGIJK":"CGJDAFIK","ACDFGIJL":"CGJDAFLI","ACDFGIKL":"CGIDAFLK","ACDFGJKL":"CGJDAFLK","ACDFHIJK":"HJFCADIK","ACDFHIJL":"HJFCADLI","ACDFHIKL":"HFICADLK","ACDFHJKL":"HJFCADLK","ACDFIJKL":"CJIDAFLK",
  "ACDGHIJK":"HGJCADIK","ACDGHIJL":"HGJCADLI","ACDGHIKL":"HGICADLK","ACDGHJKL":"HGJCADLK","ACDGIJKL":"IGJCADLK","ACDHIJKL":"HJICADLK","ACEFGHIJ":"HGJCAFEI","ACEFGHIK":"HGECAFIK","ACEFGHIL":"HGECAFLI","ACEFGHJK":"HGJCAFEK",
  "ACEFGHJL":"HGJCAFLE","ACEFGHKL":"HGECAFLK","ACEFGIJK":"EGJCAFIK","ACEFGIJL":"EGJCAFLI","ACEFGIKL":"EGICAFLK","ACEFGJKL":"EGJCAFLK","ACEFHIJK":"HJECAFIK","ACEFHIJL":"HJECAFLI","ACEFHIKL":"HEICAFLK","ACEFHJKL":"HJECAFLK",
  "ACEFIJKL":"EJICAFLK","ACEGHIJK":"EGJCAHIK","ACEGHIJL":"EGJCAHLI","ACEGHIKL":"EGICAHLK","ACEGHJKL":"EGJCAHLK","ACEGIJKL":"EJICAGLK","ACEHIJKL":"EJICAHLK","ACFGHIJK":"HGJCAFIK","ACFGHIJL":"HGJCAFLI","ACFGHIKL":"HGICAFLK",
  "ACFGHJKL":"HGJCAFLK","ACFGIJKL":"IGJCAFLK","ACFHIJKL":"HJICAFLK","ACGHIJKL":"HJICAGLK","ADEFGHIJ":"HGJDAFEI","ADEFGHIK":"HGEDAFIK","ADEFGHIL":"HGEDAFLI","ADEFGHJK":"HGJDAFEK","ADEFGHJL":"HGJDAFLE","ADEFGHKL":"HGEDAFLK",
  "ADEFGIJK":"EGJDAFIK","ADEFGIJL":"EGJDAFLI","ADEFGIKL":"EGIDAFLK","ADEFGJKL":"EGJDAFLK","ADEFHIJK":"HJEDAFIK","ADEFHIJL":"HJEDAFLI","ADEFHIKL":"HEIDAFLK","ADEFHJKL":"HJEDAFLK","ADEFIJKL":"EJIDAFLK","ADEGHIJK":"EGJDAHIK",
  "ADEGHIJL":"EGJDAHLI","ADEGHIKL":"EGIDAHLK","ADEGHJKL":"EGJDAHLK","ADEGIJKL":"EJIDAGLK","ADEHIJKL":"EJIDAHLK","ADFGHIJK":"HGJDAFIK","ADFGHIJL":"HGJDAFLI","ADFGHIKL":"HGIDAFLK","ADFGHJKL":"HGJDAFLK","ADFGIJKL":"IGJDAFLK",
  "ADFHIJKL":"HJIDAFLK","ADGHIJKL":"HJIDAGLK","AEFGHIJK":"EGJFAHIK","AEFGHIJL":"EGJFAHLI","AEFGHIKL":"EGIFAHLK","AEFGHJKL":"EGJFAHLK","AEFGIJKL":"EJIFAGLK","AEFHIJKL":"EJIFAHLK","AEGHIJKL":"EJIAHGLK","AFGHIJKL":"HJIFAGLK",
  "BCDEFGHI":"CGBDHFEI","BCDEFGHJ":"HGBCJFDE","BCDEFGHK":"CGBDHFEK","BCDEFGHL":"CGBDHFLE","BCDEFGIJ":"CGBDJFEI","BCDEFGIK":"CGBDEFIK","BCDEFGIL":"CGBDEFLI","BCDEFGJK":"CGBDJFEK","BCDEFGJL":"CGBDJFLE","BCDEFGKL":"CGBDEFLK",
  "BCDEFHIJ":"CJBDHFEI","BCDEFHIK":"CEBDHFIK","BCDEFHIL":"CEBDHFLI","BCDEFHJK":"CJBDHFEK","BCDEFHJL":"CJBDHFLE","BCDEFHKL":"CEBDHFLK","BCDEFIJK":"CJBDEFIK","BCDEFIJL":"CJBDEFLI","BCDEFIKL":"CEBDIFLK","BCDEFJKL":"CJBDEFLK",
  "BCDEGHIJ":"HGBCJDEI","BCDEGHIK":"EGBCHDIK","BCDEGHIL":"EGBCHDLI","BCDEGHJK":"HGBCJDEK","BCDEGHJL":"HGBCJDLE","BCDEGHKL":"EGBCHDLK","BCDEGIJK":"EGBCJDIK","BCDEGIJL":"EGBCJDLI","BCDEGIKL":"EGBCIDLK","BCDEGJKL":"EGBCJDLK",
  "BCDEHIJK":"EJBCHDIK","BCDEHIJL":"EJBCHDLI","BCDEHIKL":"EIBCHDLK","BCDEHJKL":"EJBCHDLK","BCDEIJKL":"EJBCIDLK","BCDFGHIJ":"HGBCJFDI","BCDFGHIK":"CGBDHFIK","BCDFGHIL":"CGBDHFLI","BCDFGHJK":"HGBCJFDK","BCDFGHJL":"CGBDHFLJ",
  "BCDFGHKL":"CGBDHFLK","BCDFGIJK":"CGBDJFIK","BCDFGIJL":"CGBDJFLI","BCDFGIKL":"CGBDIFLK","BCDFGJKL":"CGBDJFLK","BCDFHIJK":"CJBDHFIK","BCDFHIJL":"CJBDHFLI","BCDFHIKL":"CIBDHFLK","BCDFHJKL":"CJBDHFLK","BCDFIJKL":"CJBDIFLK",
  "BCDGHIJK":"HGBCJDIK","BCDGHIJL":"HGBCJDLI","BCDGHIKL":"HGBCIDLK","BCDGHJKL":"HGBCJDLK","BCDGIJKL":"IGBCJDLK","BCDHIJKL":"HJBCIDLK","BCEFGHIJ":"HGBCJFEI","BCEFGHIK":"EGBCHFIK","BCEFGHIL":"EGBCHFLI","BCEFGHJK":"HGBCJFEK",
  "BCEFGHJL":"HGBCJFLE","BCEFGHKL":"EGBCHFLK","BCEFGIJK":"EGBCJFIK","BCEFGIJL":"EGBCJFLI","BCEFGIKL":"EGBCIFLK","BCEFGJKL":"EGBCJFLK","BCEFHIJK":"EJBCHFIK","BCEFHIJL":"EJBCHFLI","BCEFHIKL":"EIBCHFLK","BCEFHJKL":"EJBCHFLK",
  "BCEFIJKL":"EJBCIFLK","BCEGHIJK":"EJBCHGIK","BCEGHIJL":"EJBCHGLI","BCEGHIKL":"EGBCIHLK","BCEGHJKL":"EJBCHGLK","BCEGIJKL":"EJBCIGLK","BCEHIJKL":"EJBCIHLK","BCFGHIJK":"HGBCJFIK","BCFGHIJL":"HGBCJFLI","BCFGHIKL":"HGBCIFLK",
  "BCFGHJKL":"HGBCJFLK","BCFGIJKL":"IGBCJFLK","BCFHIJKL":"HJBCIFLK","BCGHIJKL":"HJBCIGLK","BDEFGHIJ":"HGBDJFEI","BDEFGHIK":"EGBDHFIK","BDEFGHIL":"EGBDHFLI","BDEFGHJK":"HGBDJFEK","BDEFGHJL":"HGBDJFLE","BDEFGHKL":"EGBDHFLK",
  "BDEFGIJK":"EGBDJFIK","BDEFGIJL":"EGBDJFLI","BDEFGIKL":"EGBDIFLK","BDEFGJKL":"EGBDJFLK","BDEFHIJK":"EJBDHFIK","BDEFHIJL":"EJBDHFLI","BDEFHIKL":"EIBDHFLK","BDEFHJKL":"EJBDHFLK","BDEFIJKL":"EJBDIFLK","BDEGHIJK":"EJBDHGIK",
  "BDEGHIJL":"EJBDHGLI","BDEGHIKL":"EGBDIHLK","BDEGHJKL":"EJBDHGLK","BDEGIJKL":"EJBDIGLK","BDEHIJKL":"EJBDIHLK","BDFGHIJK":"HGBDJFIK","BDFGHIJL":"HGBDJFLI","BDFGHIKL":"HGBDIFLK","BDFGHJKL":"HGBDJFLK","BDFGIJKL":"IGBDJFLK",
  "BDFHIJKL":"HJBDIFLK","BDGHIJKL":"HJBDIGLK","BEFGHIJK":"EJBFHGIK","BEFGHIJL":"EJBFHGLI","BEFGHIKL":"EGBFIHLK","BEFGHJKL":"EJBFHGLK","BEFGIJKL":"EJBFIGLK","BEFHIJKL":"EJBFIHLK","BEGHIJKL":"EJIBHGLK","BFGHIJKL":"HJBFIGLK",
  "CDEFGHIJ":"CGJDHFEI","CDEFGHIK":"CGEDHFIK","CDEFGHIL":"CGEDHFLI","CDEFGHJK":"CGJDHFEK","CDEFGHJL":"CGJDHFLE","CDEFGHKL":"CGEDHFLK","CDEFGIJK":"CGEDJFIK","CDEFGIJL":"CGEDJFLI","CDEFGIKL":"CGEDIFLK","CDEFGJKL":"CGEDJFLK",
  "CDEFHIJK":"CJEDHFIK","CDEFHIJL":"CJEDHFLI","CDEFHIKL":"CEIDHFLK","CDEFHJKL":"CJEDHFLK","CDEFIJKL":"CJEDIFLK","CDEGHIJK":"EGJCHDIK","CDEGHIJL":"EGJCHDLI","CDEGHIKL":"EGICHDLK","CDEGHJKL":"EGJCHDLK","CDEGIJKL":"EGICJDLK",
  "CDEHIJKL":"EJICHDLK","CDFGHIJK":"CGJDHFIK","CDFGHIJL":"CGJDHFLI","CDFGHIKL":"CGIDHFLK","CDFGHJKL":"CGJDHFLK","CDFGIJKL":"CGIDJFLK","CDFHIJKL":"CJIDHFLK","CDGHIJKL":"HGICJDLK","CEFGHIJK":"EGJCHFIK","CEFGHIJL":"EGJCHFLI",
  "CEFGHIKL":"EGICHFLK","CEFGHJKL":"EGJCHFLK","CEFGIJKL":"EGICJFLK","CEFHIJKL":"EJICHFLK","CEGHIJKL":"EJICHGLK","CFGHIJKL":"HGICJFLK","DEFGHIJK":"EGJDHFIK","DEFGHIJL":"EGJDHFLI","DEFGHIKL":"EGIDHFLK","DEFGHJKL":"EGJDHFLK",
  "DEFGIJKL":"EGIDJFLK","DEFHIJKL":"EJIDHFLK","DEGHIJKL":"EJIDHGLK","DFGHIJKL":"HGIDJFLK","EFGHIJKL":"EJIFHGLK",
};



// State
let CU = null;
let userPicks = {};
let userKoPicks = {};
let userExtras = {};
let allUsers = [];
let allUserPicks = {};
let allUserKoPicks = {};
let allUserExtras = {};
let admGroupRes = {};
let admKoRes = {};
let admExtras = {};
let settings = {};
let scoresByUser = {};
let vG = "A";
let aG = "A";
let adminClicks = 0;
let adminExpandedUid = null;

function isTimeLocked() { return settings.force_locked === "true" || Date.now() >= LOCK_TIME; }
function isUserLocked() { return isTimeLocked() || (CU && CU.submitted); }

function showSaving() {
  const el = document.getElementById("saving-indicator");
  if (!el) return;
  el.style.display = "block";
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = "none"; }, 700);
}

// ====== DATA LOADERS ======

async function loadSettings() {
  if (!sb) return;
  try {
    const { data } = await sb.from("settings").select("*");
    settings = {};
    (data || []).forEach(r => settings[r.key] = r.value);
  } catch (e) { console.error("loadSettings", e); }
}

async function loadAdminResults() {
  if (!sb) return;
  try {
    const [g, k, e] = await Promise.all([
      sb.from("admin_group_results").select("*"),
      sb.from("admin_ko_results").select("*"),
      sb.from("admin_extras").select("*")
    ]);
    admGroupRes = {}; (g.data || []).forEach(r => admGroupRes[r.match_id] = r.result);
    admKoRes = {}; (k.data || []).forEach(r => admKoRes[r.match_id] = r.winner);
    admExtras = {}; (e.data || []).forEach(r => admExtras[r.key] = r.value);
  } catch (er) { console.error("loadAdminResults", er); }
}

async function loadUserPicks() {
  if (!sb || !CU) return;
  try {
    const [gp, kp, ex] = await Promise.all([
      sb.from("group_picks").select("*").eq("user_id", CU.id),
      sb.from("ko_picks").select("*").eq("user_id", CU.id),
      sb.from("extras").select("*").eq("user_id", CU.id)
    ]);
    userPicks = {}; (gp.data || []).forEach(r => userPicks[r.match_id] = r.pick);
    userKoPicks = {}; (kp.data || []).forEach(r => userKoPicks[r.match_id] = r.pick);
    userExtras = {}; (ex.data || []).forEach(r => userExtras[r.key] = r.value);
  } catch (e) { console.error("loadUserPicks", e); }
}

async function loadAllForLeaderboard() {
  if (!sb) return;
  try {
    const [users, gp, kp, ex] = await Promise.all([
      sb.from("users").select("id,name,submitted").limit(100000),
      sb.from("group_picks").select("*").limit(100000),
      sb.from("ko_picks").select("*").limit(100000),
      sb.from("extras").select("*").limit(100000)
    ]);
    allUsers = users.data || [];
    allUserPicks = {}; (gp.data || []).forEach(r => {
      if (!allUserPicks[r.user_id]) allUserPicks[r.user_id] = {};
      allUserPicks[r.user_id][r.match_id] = r.pick;
    });
    allUserKoPicks = {}; (kp.data || []).forEach(r => {
      if (!allUserKoPicks[r.user_id]) allUserKoPicks[r.user_id] = {};
      allUserKoPicks[r.user_id][r.match_id] = r.pick;
    });
    allUserExtras = {}; (ex.data || []).forEach(r => {
      if (!allUserExtras[r.user_id]) allUserExtras[r.user_id] = {};
      allUserExtras[r.user_id][r.key] = r.value;
    });
  } catch (e) { console.error("loadAllForLeaderboard", e); }
}

// ====== CORE LOGIC ======

function getRanking(picks, g) {
  return [
    picks["rank_" + g + "_1"] || null,
    picks["rank_" + g + "_2"] || null,
    picks["rank_" + g + "_3"] || null,
    picks["rank_" + g + "_4"] || null,
  ];
}

function getDisplayOrder(picks, g) {
  const teams = GROUPS[g];
  const ranking = getRanking(picks, g);
  if (ranking.every(t => t !== null)) return ranking.slice();
  const used = new Set(ranking.filter(t => t !== null));
  const result = ranking.filter(t => t !== null);
  teams.forEach(t => { if (!used.has(t)) result.push(t); });
  return result;
}

function isGroupComplete(picks, g) {
  return getRanking(picks, g).every(t => t !== null);
}

function allGroupsComplete(picks) {
  return Object.keys(GROUPS).every(g => isGroupComplete(picks, g));
}

function getThirds(picks) {
  const thirds = [];
  Object.keys(GROUPS).forEach(g => {
    const t = picks["rank_" + g + "_3"];
    if (t) thirds.push({group: g, name: t});
  });
  return thirds;
}

function getAdvancingThirds(picks) {
  const csv = picks.thirds_advancing || "";
  if (!csv) return [];
  return csv.split(",").filter(s => s.length > 0);
}

function isThirdsComplete(picks) {
  return getAdvancingThirds(picks).length === 8;
}

function buildR32(picks) {
  const top = {}, sec = {}, third = {};
  Object.keys(GROUPS).forEach(g => {
    top[g] = picks["rank_" + g + "_1"] || null;
    sec[g] = picks["rank_" + g + "_2"] || null;
    third[g] = picks["rank_" + g + "_3"] || null;
  });

  // Get the 8 advancing thirds and map to their groups
  const advThirds = getAdvancingThirds(picks);
  const thirdsByName = {};
  Object.keys(GROUPS).forEach(g => { if (third[g]) thirdsByName[third[g]] = g; });
  const advancingGroups = advThirds.map(n => thirdsByName[n]).filter(Boolean);

  // FIFA Annex C lookup — official mapping by sorted-group-letter key
  const assignment = {};
  if (advancingGroups.length === 8) {
    const key = advancingGroups.slice().sort().join('');
    const value = ANNEX_C[key];
    if (value) {
      // Order in value: [m79, m85, m81, m74, m82, m77, m87, m80]
      assignment.m79 = third[value[0]];
      assignment.m85 = third[value[1]];
      assignment.m81 = third[value[2]];
      assignment.m74 = third[value[3]];
      assignment.m82 = third[value[4]];
      assignment.m77 = third[value[5]];
      assignment.m87 = third[value[6]];
      assignment.m80 = third[value[7]];
    }
  }

  const THIRD_LABELS = {
    m74: "3rd A/B/C/D/F", m77: "3rd C/D/F/G/H",
    m79: "3rd C/E/F/H/I", m80: "3rd E/H/I/J/K",
    m81: "3rd B/E/F/I/J", m82: "3rd A/E/H/I/J",
    m85: "3rd E/F/G/I/J", m87: "3rd D/E/I/J/L"
  };

  const tb = sid => assignment[sid] || (THIRD_LABELS[sid] + " (TBD)");
  const tor = (val, label) => val || label;

  return [
    {id:"r32_1",  home: tor(sec.A, "Group A 2nd (TBD)"), away: tor(sec.B, "Group B 2nd (TBD)")},
    {id:"r32_2",  home: tor(top.E, "Group E 1st (TBD)"), away: tb('m74')},
    {id:"r32_3",  home: tor(top.F, "Group F 1st (TBD)"), away: tor(sec.C, "Group C 2nd (TBD)")},
    {id:"r32_4",  home: tor(top.C, "Group C 1st (TBD)"), away: tor(sec.F, "Group F 2nd (TBD)")},
    {id:"r32_5",  home: tor(top.I, "Group I 1st (TBD)"), away: tb('m77')},
    {id:"r32_6",  home: tor(sec.E, "Group E 2nd (TBD)"), away: tor(sec.I, "Group I 2nd (TBD)")},
    {id:"r32_7",  home: tor(top.A, "Group A 1st (TBD)"), away: tb('m79')},
    {id:"r32_8",  home: tor(top.L, "Group L 1st (TBD)"), away: tb('m80')},
    {id:"r32_9",  home: tor(top.D, "Group D 1st (TBD)"), away: tb('m81')},
    {id:"r32_10", home: tor(top.G, "Group G 1st (TBD)"), away: tb('m82')},
    {id:"r32_11", home: tor(sec.K, "Group K 2nd (TBD)"), away: tor(sec.L, "Group L 2nd (TBD)")},
    {id:"r32_12", home: tor(top.H, "Group H 1st (TBD)"), away: tor(sec.J, "Group J 2nd (TBD)")},
    {id:"r32_13", home: tor(top.B, "Group B 1st (TBD)"), away: tb('m85')},
    {id:"r32_14", home: tor(top.J, "Group J 1st (TBD)"), away: tor(sec.H, "Group H 2nd (TBD)")},
    {id:"r32_15", home: tor(top.K, "Group K 1st (TBD)"), away: tb('m87')},
    {id:"r32_16", home: tor(sec.D, "Group D 2nd (TBD)"), away: tor(sec.G, "Group G 2nd (TBD)")}
  ];
}

function buildBracket(picks, koRes) {
  const r32 = buildR32(picks);
  const R16_PAIRS = [
    {id:'r16_1', from:['r32_1', 'r32_3']},
    {id:'r16_2', from:['r32_2', 'r32_5']},
    {id:'r16_3', from:['r32_4', 'r32_6']},
    {id:'r16_4', from:['r32_7', 'r32_8']},
    {id:'r16_5', from:['r32_11', 'r32_12']},
    {id:'r16_6', from:['r32_9', 'r32_10']},
    {id:'r16_7', from:['r32_14', 'r32_16']},
    {id:'r16_8', from:['r32_13', 'r32_15']}
  ];
  const QF_PAIRS = [
    {id:'qf_1', from:['r16_2', 'r16_1']},
    {id:'qf_2', from:['r16_5', 'r16_6']},
    {id:'qf_3', from:['r16_3', 'r16_4']},
    {id:'qf_4', from:['r16_7', 'r16_8']}
  ];
  const SF_PAIRS = [
    {id:'sf_1', from:['qf_1', 'qf_2']},
    {id:'sf_2', from:['qf_3', 'qf_4']}
  ];
  function buildRound(pairs) {
    return pairs.map(p => ({
      id: p.id,
      home: koRes[p.from[0]] || ("Winner of match " + p.from[0]),
      away: koRes[p.from[1]] || ("Winner of match " + p.from[1])
    }));
  }
  const r16 = buildRound(R16_PAIRS);
  const qf  = buildRound(QF_PAIRS);
  const sf  = buildRound(SF_PAIRS);
  const sfW0 = koRes[sf[0].id] || null;
  const sfW1 = koRes[sf[1].id] || null;
  const sfL0 = sfW0 ? (sfW0 === sf[0].home ? sf[0].away : sf[0].home) : null;
  const sfL1 = sfW1 ? (sfW1 === sf[1].home ? sf[1].away : sf[1].home) : null;
  return {
    r32, r16, qf, sf,
    bronze: {id:"bronze", home: sfL0 || "SF1 loser", away: sfL1 || "SF2 loser"},
    final:  {id:"final",  home: sfW0 || "SF1 winner", away: sfW1 || "SF2 winner"}
  };
}

// ====== NAV ======

function nav(p) {
  document.querySelectorAll("#main-nav .ntab").forEach(b => b.classList.remove("on"));
  document.querySelectorAll(".pg").forEach(s => s.classList.remove("on"));
  const pages = {"home":"pg-home","reg":"pg-reg","pick":"pg-pick","board":"pg-board","admin":"pg-admin"};
  const tabs = {"home":0,"reg":1,"pick":2,"board":3,"admin":4};
  const pgEl = document.getElementById(pages[p]);
  if (pgEl) pgEl.classList.add("on");
  const navBtns = document.querySelectorAll("#main-nav .ntab");
  if (navBtns[tabs[p]]) navBtns[tabs[p]].classList.add("on");
  if (p === "pick") renderPick();
  if (p === "board") loadAllForLeaderboard().then(() => { computeScores(); renderBoard(); });
  if (p === "admin") loadAllForLeaderboard().then(() => renderAdm());
}

function showAdmin() {
  adminClicks++;
  if (adminClicks >= 1) {
    document.getElementById("admin-tab").style.display = "inline-block";
    nav("admin");
  }
}

// ====== BOOT ======

async function boot() {
  if (!configIsValid()) {
    document.getElementById("config-error").style.display = "block";
    document.getElementById("app-content").style.display = "none";
    return;
  }
  document.getElementById("app-content").style.display = "block";
  await loadSettings();
  await loadAdminResults();
  const uid = localStorage.getItem("wc2026_uid");
  if (uid) {
    try {
      const { data } = await sb.from("users").select("*").eq("id", uid).single();
      if (data) CU = data;
    } catch (e) {}
  }
  if (CU) await loadUserPicks();
  await loadAllForLeaderboard();
  computeScores();
  tickCountdown();
  setInterval(tickCountdown, 1000);
  updateHome();
}

function tickCountdown() {
  const now = Date.now();
  const diff = LOCK_TIME - now;
  const el = document.getElementById("home-cd");
  if (!el) return;
  if (diff <= 0) {
    el.textContent = "Predictions locked — tournament started!";
    const hl = document.getElementById("home-lock");
    if (hl) hl.style.display = "flex";
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  el.textContent = "Closes in " + d + "d " + h + "h " + m + "m " + s + "s";
}

function updateHome() {
  document.getElementById("h-players").textContent = allUsers.length;
  document.getElementById("h-st").textContent = isTimeLocked() ? "Closed" : "Open";
  if (isTimeLocked()) {
    const rl = document.getElementById("reg-lock");
    if (rl) rl.style.display = "flex";
  }
}

// ====== AUTH ======

async function register() {
  const name = (document.getElementById("reg-name").value || "").trim();
  const pw = (document.getElementById("reg-pass").value || "").trim();
  if (!name || !pw) { document.getElementById("reg-msg").textContent = "Please enter name and password."; return; }
  if (isTimeLocked()) { document.getElementById("reg-msg").textContent = "Registration closed."; return; }
  try {
    const existing = await sb.from("users").select("id").eq("name", name);
    if (existing.data && existing.data.length) { document.getElementById("reg-msg").textContent = "Name taken. Use Log in below."; return; }
    const { data, error } = await sb.from("users").insert([{name, password: pw}]).select().single();
    if (error) { document.getElementById("reg-msg").textContent = "Error: " + error.message; return; }
    CU = data;
    localStorage.setItem("wc2026_uid", CU.id);
    await loadUserPicks();
    await loadAllForLeaderboard();
    nav("pick");
  } catch (e) { document.getElementById("reg-msg").textContent = "Error: " + e.message; }
}

async function doLogin() {
  const name = (document.getElementById("li-name").value || "").trim();
  const pw = (document.getElementById("li-pass").value || "").trim();
  if (!name || !pw) { document.getElementById("li-msg").textContent = "Enter both name and password."; return; }
  try {
    const { data } = await sb.from("users").select("*").eq("name", name).eq("password", pw);
    if (!data || !data.length) { document.getElementById("li-msg").textContent = "Invalid credentials."; return; }
    CU = data[0];
    localStorage.setItem("wc2026_uid", CU.id);
    await loadUserPicks();
    await loadAllForLeaderboard();
    nav("pick");
  } catch (e) { document.getElementById("li-msg").textContent = "Error: " + e.message; }
}

function logout() {
  CU = null;
  userPicks = {}; userKoPicks = {}; userExtras = {};
  localStorage.removeItem("wc2026_uid");
  nav("home");
}

// ====== PICKS UI ======

async function moveTeam(g, teamName, direction) {
  if (isUserLocked()) return;
  const displayOrder = getDisplayOrder(userPicks, g);
  const idx = displayOrder.indexOf(teamName);
  if (idx === -1) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx > 3) return;
  [displayOrder[idx], displayOrder[newIdx]] = [displayOrder[newIdx], displayOrder[idx]];
  await saveRanking(g, displayOrder);
  renderPickGroup();
  renderPickGTabs();
  renderPickKO();
  updateProgress();
}

async function saveRanking(g, ranking) {
  if (!CU) return;
  showSaving();
  ranking.forEach((team, i) => { userPicks["rank_" + g + "_" + (i+1)] = team; });
  // Invalidate thirds_advancing if the 3rd of any group changed (some advancing thirds may no longer exist)
  const adv = getAdvancingThirds(userPicks);
  const validThirds = new Set(getThirds(userPicks).map(t => t.name));
  const stillValid = adv.filter(t => validThirds.has(t));
  if (stillValid.length !== adv.length) {
    userPicks.thirds_advancing = stillValid.join(",");
  }
  const rows = ranking.map((team, i) => ({
    user_id: CU.id, match_id: "rank_" + g + "_" + (i+1), pick: team
  }));
  try {
    await sb.from("group_picks").upsert(rows, {onConflict: "user_id,match_id"});
    if (stillValid.length !== adv.length) {
      await sb.from("group_picks").upsert([{
        user_id: CU.id, match_id: "thirds_advancing", pick: stillValid.join(",")
      }], {onConflict: "user_id,match_id"});
    }
  } catch (e) { console.error("saveRanking", e); }
}

async function toggleThirdAdvance(teamName) {
  if (!CU || isUserLocked()) return;
  const current = getAdvancingThirds(userPicks);
  let newList;
  if (current.includes(teamName)) {
    newList = current.filter(t => t !== teamName);
  } else {
    if (current.length >= 8) { alert("Only 8 thirds can advance."); return; }
    newList = current.concat([teamName]);
  }
  showSaving();
  userPicks.thirds_advancing = newList.join(",");
  try {
    await sb.from("group_picks").upsert([{
      user_id: CU.id, match_id: "thirds_advancing", pick: newList.join(",")
    }], {onConflict: "user_id,match_id"});
  } catch (e) { console.error("toggleThirdAdvance", e); }
  renderPickKO();
  updateProgress();
}

async function setKoPick(matchId, teamName) {
  if (!CU || isUserLocked()) return;
  showSaving();
  userKoPicks[matchId] = teamName;
  try {
    await sb.from("ko_picks").upsert([{user_id: CU.id, match_id: matchId, pick: teamName}], {onConflict: "user_id,match_id"});
  } catch (e) { console.error("setKoPick", e); }
  renderPickKO();
  updateProgress();
}

async function saveTopScorer() {
  if (!CU || isUserLocked()) return;
  const ts = (document.getElementById("pick-topscorer").value || "").trim();
  showSaving();
  userExtras.top_scorer = ts;
  try {
    await sb.from("extras").upsert([{user_id: CU.id, key: "top_scorer", value: ts}], {onConflict: "user_id,key"});
  } catch (e) { console.error("saveTopScorer", e); }
  updateProgress();
}

async function submitPicks() {
  if (!CU) return;
  if (isTimeLocked()) { alert("Predictions are locked."); return; }
  if (!canSubmit()) { alert("Complete all picks first: 12 group rankings, 8 thirds, all KO picks, top scorer."); return; }
  try {
    await sb.from("users").update({submitted: true}).eq("id", CU.id);
    CU.submitted = true;
    renderPick();
    alert("Predictions submitted! Good luck.");
  } catch (e) { alert("Error: " + e.message); }
}

function canSubmit() {
  if (!allGroupsComplete(userPicks)) return false;
  if (!isThirdsComplete(userPicks)) return false;
  const bracket = buildBracket(userPicks, userKoPicks);
  const allMatches = bracket.r32.concat(bracket.r16).concat(bracket.qf).concat(bracket.sf).concat([bracket.bronze, bracket.final]);
  for (const m of allMatches) {
    if (!userKoPicks[m.id]) return false;
  }
  if (!(userExtras.top_scorer || "").trim()) return false;
  return true;
}

function pickTab(t) {
  const map = {"groups":"sec-groups","knockout":"sec-knockout","special":"sec-special"};
  document.querySelectorAll("#pg-pick .pick-tab").forEach(b => b.classList.remove("on"));
  Object.values(map).forEach(id => { const el = document.getElementById(id); if (el) el.style.display = "none"; });
  const tabBtns = document.querySelectorAll("#pg-pick .pick-tab");
  const order = ["groups","knockout","special"];
  const idx = order.indexOf(t);
  if (idx >= 0 && tabBtns[idx]) tabBtns[idx].classList.add("on");
  const el = document.getElementById(map[t]);
  if (el) el.style.display = "block";
  // Re-render active pane so it reflects latest state
  if (t === "groups") renderPickGroup();
  else if (t === "knockout") renderPickKO();
  else if (t === "special") renderPickSpecial();
}

function renderPick() {
  if (!CU) {
    document.getElementById("pick-gate").style.display = "block";
    document.getElementById("pick-main").style.display = "none";
    return;
  }
  document.getElementById("pick-gate").style.display = "none";
  document.getElementById("pick-main").style.display = "block";
  document.getElementById("pick-uname").textContent = CU.name;
  const lk = isUserLocked();
  document.getElementById("pick-lock-banner").style.display = isTimeLocked() ? "flex" : "none";
  document.getElementById("pick-submitted-banner").style.display = (CU.submitted && !isTimeLocked()) ? "flex" : "none";
  renderPickGTabs();
  renderPickGroup();
  renderPickKO();
  renderPickSpecial();
  // Clear old standings element (we don't use it anymore)
  const ps = document.getElementById("pick-standings");
  if (ps) ps.innerHTML = "";
  updateProgress();
}

function renderPickGTabs() {
  let h = '';
  Object.keys(GROUPS).forEach(g => {
    const complete = isGroupComplete(userPicks, g);
    const active = (g === vG);
    h += '<button class="stab' + (active ? ' on' : '') + (complete ? ' done' : '') + '" onclick="swVG(\'' + g + '\')">' + g + (complete ? ' ✓' : '') + '</button>';
  });
  document.getElementById("pick-gtabs").innerHTML = h;
}

function swVG(g) { vG = g; renderPickGTabs(); renderPickGroup(); }

function renderPickGroup() {
  if (!CU) return;
  const lk = isUserLocked();
  const displayOrder = getDisplayOrder(userPicks, vG);

  let h = '<div class="card"><div class="lbl">Group ' + vG + ' — predict final order</div>';
  h += '<div style="font-size:12px;color:var(--text-sec);margin-bottom:12px;line-height:1.5">Use ↑↓ to rank teams. 1st &amp; 2nd advance directly. 3rd may advance via the Knockout tab.</div>';

  displayOrder.forEach((team, idx) => {
    const pos = idx + 1;
    const status = pos === 1 ? "Group winner · 3 pts" : pos === 2 ? "Runner-up · 2 pts" : pos === 3 ? "3rd place · 1 pt" : "Eliminated";
    const upDisabled = (idx === 0) || lk;
    const downDisabled = (idx === 3) || lk;
    const rowBg = pos <= 2 ? "background:var(--success-bg)" : pos === 3 ? "background:var(--warn-bg)" : "background:var(--bg-secondary)";
    const teamEsc = team.replace(/'/g, "\\'");
    h += '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:0.5px solid var(--border);border-radius:8px;margin-bottom:6px;' + rowBg + '">';
    h += '<span style="font-weight:600;font-size:14px;width:22px;color:var(--text-sec)">' + pos + '.</span>';
    h += '<div style="flex:1;min-width:0"><div style="font-weight:500;font-size:14px;color:var(--text)">' + team + '</div><div style="font-size:11px;color:var(--text-sec)">' + status + '</div></div>';
    h += '<button onclick="moveTeam(\'' + vG + '\',\'' + teamEsc + '\',-1)" ' + (upDisabled ? 'disabled' : '') + ' style="padding:5px 11px;font-size:14px">↑</button>';
    h += '<button onclick="moveTeam(\'' + vG + '\',\'' + teamEsc + '\',1)" ' + (downDisabled ? 'disabled' : '') + ' style="padding:5px 11px;font-size:14px">↓</button>';
    h += '</div>';
  });
  h += '</div>';
  document.getElementById("pick-gcontent").innerHTML = h;
}

function renderPickKO() {
  if (!CU) return;
  const lk = isUserLocked();
  const bracket = buildBracket(userPicks, userKoPicks);

  let h = '';
  const thirds = getThirds(userPicks);
  const advancing = new Set(getAdvancingThirds(userPicks));
  if (thirds.length === 0) {
    h += '<div class="card"><div class="lbl">Pick 8 advancing thirds</div><div style="font-size:13px;color:var(--text-sec);line-height:1.6">Complete your group rankings first to see the 12 third-place teams.<br><br><b>How thirds advance:</b> Of the 12 group third-place finishers, only the <b>8 best</b> reach the Round of 32. FIFA ranks the thirds by:<br>1. Points<br>2. Goal difference<br>3. Goals scored<br>4. Fair play conduct<br>5. Drawing of lots</div></div>';
  } else {
    h += '<div class="card"><div class="lbl">Pick 8 advancing third-place teams <span style="text-transform:none;font-weight:500;letter-spacing:0">(' + advancing.size + '/8 · 1 pt each)</span></div>';
    h += '<div style="font-size:12px;color:var(--text-sec);margin-bottom:14px;line-height:1.6">';
    h += '<b>How thirds advance in FIFA 2026:</b><br>';
    h += 'Of the 12 group third-place finishers, only the <b>8 best</b> reach the Round of 32. FIFA ranks them by:<br>';
    h += '1. Points · 2. Goal difference · 3. Goals scored · 4. Fair play · 5. Drawing of lots<br><br>';
    h += 'Below are your predicted third-place teams (one per group). <b>Pick 8</b> you think will advance.';
    h += '</div>';
    const sortedThirds = thirds.slice().sort((a,b) => a.group.localeCompare(b.group));
    sortedThirds.forEach(t => {
      const isSel = advancing.has(t.name);
      const btnDisabled = ((!isSel && advancing.size >= 8) || lk);
      const rowBg = isSel ? "background:var(--success-bg)" : "background:var(--bg-secondary)";
      const teamEsc = t.name.replace(/'/g, "\\'");
      h += '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:0.5px solid var(--border);border-radius:8px;margin-bottom:5px;' + rowBg + '">';
      h += '<span style="font-weight:600;font-size:12px;width:22px;color:var(--text-sec)">' + t.group + '</span>';
      h += '<span style="flex:1;font-size:14px;font-weight:500;color:var(--text)">' + t.name + '</span>';
      h += '<button onclick="toggleThirdAdvance(\'' + teamEsc + '\')" ' + (btnDisabled ? 'disabled' : '') + ' style="padding:5px 12px;font-size:12px;background:' + (isSel ? 'var(--primary)' : '#fff') + ';color:' + (isSel ? '#fff' : 'var(--text)') + ';border-color:' + (isSel ? 'var(--primary)' : 'var(--border-strong)') + ';font-weight:500">' + (isSel ? '✓ Selected' : 'Pick') + '</button>';
      h += '</div>';
    });
    h += '</div>';
  }

  const rounds = [
    {label:"Round of 32",    pts:"2 pts",  matches: bracket.r32},
    {label:"Round of 16",    pts:"3 pts",  matches: bracket.r16},
    {label:"Quarter-finals", pts:"4 pts",  matches: bracket.qf},
    {label:"Semi-finals",    pts:"5 pts",  matches: bracket.sf},
    {label:"Third place",    pts:"4 pts",  matches: [bracket.bronze]},
    {label:"Final",          pts:"20 pts", matches: [bracket.final]}
  ];
  rounds.forEach(({label, pts, matches}) => {
    h += '<div class="round-hdr">' + label + '<span class="pts-badge">' + pts + '</span></div>';
    matches.forEach(m => {
      const isTBD = /Winner|loser|TBD|SF|3rd /.test(m.home) || /Winner|loser|TBD|SF|3rd /.test(m.away);
      const sel = userKoPicks[m.id] || null;
      const canClick = !isTBD && !lk;
      const hCls = "ko-tm" + (sel === m.home ? " sel" : "") + (!canClick ? " disabled" : "") + (isTBD ? " tbd" : "");
      const aCls = "ko-tm" + (sel === m.away ? " sel" : "") + (!canClick ? " disabled" : "") + (isTBD ? " tbd" : "");
      const hEsc = m.home.replace(/'/g, "\\'");
      const aEsc = m.away.replace(/'/g, "\\'");
      const hClk = canClick ? 'onclick="setKoPick(\'' + m.id + '\',\'' + hEsc + '\')"' : "";
      const aClk = canClick ? 'onclick="setKoPick(\'' + m.id + '\',\'' + aEsc + '\')"' : "";
      h += '<div class="ko-match' + (isTBD ? " pending" : "") + '"><div class="ko-teams-row"><div class="' + hCls + '" ' + hClk + '>' + m.home + '</div><div class="ko-vs">vs</div><div class="' + aCls + '" ' + aClk + '>' + m.away + '</div></div></div>';
    });
  });
  document.getElementById("pick-ko-content").innerHTML = h;
}

function renderPickSpecial() {
  const ts = document.getElementById("pick-topscorer");
  if (ts) {
    ts.value = userExtras.top_scorer || "";
    ts.disabled = isUserLocked();
    ts.onblur = saveTopScorer;
  }
}

function updateProgress() {
  if (!CU) return;
  const lk = isUserLocked();
  const groupsDone = Object.keys(GROUPS).filter(g => isGroupComplete(userPicks, g)).length;
  const thirdsCount = getAdvancingThirds(userPicks).length;
  const bracket = buildBracket(userPicks, userKoPicks);
  const allKo = bracket.r32.concat(bracket.r16).concat(bracket.qf).concat(bracket.sf).concat([bracket.bronze, bracket.final]);
  const koDone = allKo.filter(m => userKoPicks[m.id]).length;
  const koTotal = allKo.length;
  const scorerDone = !!(userExtras.top_scorer || "").trim();

  // Progress: groups (12) + thirds (8) + KO (32) + scorer (1) = 53 total milestones
  const done = groupsDone + Math.min(thirdsCount, 8) + koDone + (scorerDone ? 1 : 0);
  const total = 12 + 8 + koTotal + 1;
  const pct = Math.round((done / total) * 100);

  const pl = document.getElementById("prog-label");
  const pp = document.getElementById("prog-pct");
  const pf = document.getElementById("prog-fill");
  if (pl) pl.textContent = groupsDone + "/12 groups · " + thirdsCount + "/8 thirds · " + koDone + "/" + koTotal + " KO";
  if (pp) pp.textContent = pct + "%";
  if (pf) pf.style.width = pct + "%";

  const ss = document.getElementById("submit-status");
  if (ss) {
    if (CU.submitted) ss.innerHTML = "✓ Submitted and locked.";
    else if (lk) ss.innerHTML = "🔒 Locked.";
    else if (canSubmit()) ss.innerHTML = "All picks complete — ready to submit!";
    else ss.innerHTML = "Still need: " + (12-groupsDone) + " groups, " + (8-thirdsCount) + " thirds, " + (koTotal-koDone) + " KO, " + (scorerDone ? "" : "top scorer");
  }
  const sb = document.getElementById("submit-btn");
  if (sb) sb.disabled = lk || CU.submitted || !canSubmit();
  if (sb) sb.textContent = CU.submitted ? "Submitted ✓" : "Submit my final picks";
}

// ====== LEADERBOARD ======

function computeScores() {
  scoresByUser = {};
  allUsers.forEach(u => {
    scoresByUser[u.id] = { name: u.name, groups: 0, thirds: 0, ko: 0, scorer: 0, total: 0 };
  });

  allUsers.forEach(u => {
    const picks = allUserPicks[u.id] || {};
    Object.keys(GROUPS).forEach(g => {
      [1, 2, 3].forEach(pos => {
        const userTeam = picks["rank_" + g + "_" + pos];
        const realTeam = admGroupRes["rank_" + g + "_" + pos];
        if (userTeam && realTeam && userTeam === realTeam) {
          const pts = GROUP_POS_PTS[pos - 1];
          scoresByUser[u.id].groups += pts;
          scoresByUser[u.id].total += pts;
        }
      });
    });
  });

  const realAdv = new Set((admGroupRes.thirds_advancing || "").split(",").filter(s => s));
  allUsers.forEach(u => {
    const picks = allUserPicks[u.id] || {};
    const userAdv = (picks.thirds_advancing || "").split(",").filter(s => s);
    userAdv.forEach(t => {
      if (realAdv.has(t)) {
        scoresByUser[u.id].thirds += THIRD_ADV_PT;
        scoresByUser[u.id].total += THIRD_ADV_PT;
      }
    });
  });

  // LENIENT scoring: award points if user picked a team to advance from a round
  // and that team actually advanced (regardless of which bracket slot).
  const realBracket = buildBracket(admGroupRes, admKoRes);
  ["r32","r16","qf","sf"].forEach(k => {
    const pts = KO_PTS[k];
    // Set of teams that actually advanced from this round
    const realAdvancers = new Set();
    realBracket[k].forEach(rm => {
      const w = admKoRes[rm.id];
      if (w) realAdvancers.add(w);
    });
    if (realAdvancers.size === 0) return;
    allUsers.forEach(u => {
      const koP = allUserKoPicks[u.id] || {};
      const userBracket = buildBracket(allUserPicks[u.id] || {}, koP);
      // Set of teams the user picked to advance from this round
      const userAdvancers = new Set();
      userBracket[k].forEach(um => {
        const w = koP[um.id];
        if (w) userAdvancers.add(w);
      });
      // Award pts for each team in both sets
      userAdvancers.forEach(team => {
        if (realAdvancers.has(team)) {
          scoresByUser[u.id].ko += pts;
          scoresByUser[u.id].total += pts;
        }
      });
    });
  });

  if (admKoRes.bronze) {
    allUsers.forEach(u => {
      if ((allUserKoPicks[u.id] || {}).bronze === admKoRes.bronze) {
        scoresByUser[u.id].ko += KO_PTS.bronze;
        scoresByUser[u.id].total += KO_PTS.bronze;
      }
    });
  }
  if (admKoRes.final) {
    allUsers.forEach(u => {
      if ((allUserKoPicks[u.id] || {}).final === admKoRes.final) {
        scoresByUser[u.id].ko += KO_PTS.final;
        scoresByUser[u.id].total += KO_PTS.final;
      }
    });
  }

  const realScorer = (admExtras.top_scorer || "").toLowerCase().trim();
  if (realScorer) {
    allUsers.forEach(u => {
      const us = ((allUserExtras[u.id] || {}).top_scorer || "").toLowerCase().trim();
      if (us && us === realScorer) {
        scoresByUser[u.id].scorer = SCORER_PT;
        scoresByUser[u.id].total += SCORER_PT;
      }
    });
  }
}

function renderBoard() {
  const arr = Object.entries(scoresByUser).map(([id, s]) => ({id, ...s}));
  arr.sort((a, b) => b.total - a.total);
  let h = '';
  if (arr.length === 0) {
    h = '<div style="font-size:13px;color:var(--text-sec);padding:8px 0">No predictions yet.</div>';
  } else {
    h += '<div class="lbl" style="margin-top:0">Standings · Total points</div>';
    arr.forEach((s, i) => {
      const avCls = i === 0 ? "av1" : i === 1 ? "av2" : i === 2 ? "av3" : "avn";
      h += '<div class="lb-row"><div class="av ' + avCls + '">' + (i+1) + '</div>';
      h += '<div><div style="font-weight:500">' + s.name + '</div><div style="font-size:11px;color:var(--text-sec)">Grp ' + s.groups + ' · 3rd ' + s.thirds + ' · KO ' + s.ko + ' · TS ' + s.scorer + '</div></div>';
      h += '<div style="text-align:right"><div style="font-weight:600;font-size:18px">' + s.total + '</div><div style="font-size:11px;color:var(--text-sec)">pts</div></div></div>';
    });
  }
  document.getElementById("lb-list").innerHTML = h;
  document.getElementById("lb-specials").innerHTML = '<div class="lbl" style="margin-top:0">Official top scorer</div><div style="font-size:14px;font-weight:500">' + (admExtras.top_scorer || "—") + '</div>';
}

// ====== ADMIN ======

async function adminIn() {
  const pw = (document.getElementById("adm-pw").value || "").trim();
  const dbPw = settings.admin_password || "admin2026";
  if (pw !== dbPw) { document.getElementById("adm-msg").textContent = "Wrong password."; return; }
  document.getElementById("adm-gate").style.display = "none";
  document.getElementById("adm-main").style.display = "block";
  await loadAllForLeaderboard();
  await loadAdminUsers();
  computeScores();
  renderAdm();
}

async function loadAdminUsers() {
  if (!sb) return;
  try {
    const { data } = await sb.from("users").select("*").order("name");
    const users = data || [];
    document.getElementById("adm-user-count").textContent = users.length;
    // Make sure scores are fresh for the detail view
    computeScores();
    let h = '';
    users.forEach(u => {
      const sub = u.submitted ? ' <span style="font-size:11px;color:var(--primary)">submitted</span>' : '';
      const isExp = adminExpandedUid === u.id;
      const score = scoresByUser[u.id] || {total: 0};
      const nameEsc = u.name.replace(/'/g, "\\'");
      h += '<div class="trow" style="border-bottom:0.5px solid var(--border)">';
      h += '<span style="flex:1">' + u.name + sub + ' <span style="font-size:11px;color:var(--text-sec)">· ' + score.total + ' pts</span></span>';
      h += '<button onclick="toggleViewUser(\'' + u.id + '\')" style="font-size:11px;padding:3px 8px;margin-right:6px">' + (isExp ? 'Hide ▲' : 'View ▼') + '</button>';
      h += '<button onclick="deleteUser(\'' + u.id + '\',\'' + nameEsc + '\')" style="font-size:11px;padding:3px 8px;border-color:var(--danger);color:var(--danger)">Delete</button>';
      h += '</div>';
      if (isExp) h += renderUserPicksDetail(u.id);
    });
    document.getElementById("adm-user-list").innerHTML = h || '<div style="font-size:12px;color:var(--text-sec)">No players yet.</div>';
  } catch (e) { console.error("loadAdminUsers", e); }
}

function toggleViewUser(uid) {
  adminExpandedUid = (adminExpandedUid === uid) ? null : uid;
  loadAdminUsers();
}

function renderUserPicksDetail(uid) {
  const picks = allUserPicks[uid] || {};
  const koP = allUserKoPicks[uid] || {};
  const ex = allUserExtras[uid] || {};
  const score = scoresByUser[uid] || {groups:0, thirds:0, ko:0, scorer:0, total:0};

  let h = '<div style="background:var(--bg-secondary);border:0.5px solid var(--border);border-radius:8px;padding:12px;margin:4px 0 10px;font-size:12px;line-height:1.6">';

  // Group rankings
  h += '<div style="font-weight:600;margin-bottom:6px;font-size:11px;text-transform:uppercase;color:var(--text-sec);letter-spacing:0.06em">Group rankings</div>';
  Object.keys(GROUPS).forEach(g => {
    const r = getRanking(picks, g);
    const realR = getRanking(admGroupRes, g);
    h += '<div style="margin-bottom:3px"><b>' + g + ':</b> ';
    if (r.every(t => t !== null)) {
      h += r.map((t, i) => {
        const real = realR[i];
        const matched = real && t === real;
        const style = matched ? 'color:var(--primary);font-weight:600' : '';
        return '<span style="' + style + '">' + (i+1) + '.' + t + '</span>';
      }).join(' · ');
    } else {
      h += '<span style="color:var(--text-tert)"><i>incomplete</i></span>';
    }
    h += '</div>';
  });

  // Advancing thirds
  const adv = getAdvancingThirds(picks);
  const realAdv = new Set((admGroupRes.thirds_advancing || "").split(",").filter(s => s));
  h += '<div style="font-weight:600;margin-top:10px;margin-bottom:4px;font-size:11px;text-transform:uppercase;color:var(--text-sec);letter-spacing:0.06em">Advancing thirds (' + adv.length + '/8)</div>';
  if (adv.length) {
    h += '<div>' + adv.map(t => {
      const matched = realAdv.has(t);
      const style = matched ? 'color:var(--primary);font-weight:600' : '';
      return '<span style="' + style + '">' + t + '</span>';
    }).join(', ') + '</div>';
  } else {
    h += '<div style="color:var(--text-tert)"><i>none</i></div>';
  }

  // Knockout picks
  h += '<div style="font-weight:600;margin-top:10px;margin-bottom:4px;font-size:11px;text-transform:uppercase;color:var(--text-sec);letter-spacing:0.06em">Knockout picks</div>';
  const bracket = buildBracket(picks, koP);
  const realBracket = buildBracket(admGroupRes, admKoRes);
  [['r32','R32'],['r16','R16'],['qf','QF'],['sf','SF']].forEach(([k, lbl]) => {
    const realSet = new Set();
    realBracket[k].forEach(rm => { const w = admKoRes[rm.id]; if (w) realSet.add(w); });
    const winners = bracket[k].map(m => koP[m.id]).filter(Boolean);
    h += '<div><b>' + lbl + ':</b> ';
    if (winners.length) {
      h += winners.map(w => {
        const matched = realSet.has(w);
        const style = matched ? 'color:var(--primary);font-weight:600' : '';
        return '<span style="' + style + '">' + w + '</span>';
      }).join(', ');
    } else {
      h += '<span style="color:var(--text-tert)"><i>none</i></span>';
    }
    h += '</div>';
  });
  const bronzeMatched = koP.bronze && koP.bronze === admKoRes.bronze;
  const finalMatched = koP.final && koP.final === admKoRes.final;
  h += '<div><b>Bronze:</b> <span style="' + (bronzeMatched ? 'color:var(--primary);font-weight:600' : '') + '">' + (koP.bronze || '<i style="color:var(--text-tert)">none</i>') + '</span></div>';
  h += '<div><b>Champion:</b> <span style="' + (finalMatched ? 'color:var(--primary);font-weight:600' : '') + '">' + (koP.final || '<i style="color:var(--text-tert)">none</i>') + '</span></div>';

  // Top scorer
  const tsMatched = (ex.top_scorer || "").toLowerCase().trim() === (admExtras.top_scorer || "").toLowerCase().trim() && (ex.top_scorer || "").trim() !== "";
  h += '<div style="margin-top:8px"><b>Top scorer:</b> <span style="' + (tsMatched ? 'color:var(--primary);font-weight:600' : '') + '">' + (ex.top_scorer || '<i style="color:var(--text-tert)">none</i>') + '</span></div>';

  // Score summary
  h += '<div style="margin-top:10px;padding-top:8px;border-top:0.5px solid var(--border);font-weight:600">Score: Groups ' + score.groups + ' · Thirds ' + score.thirds + ' · KO ' + score.ko + ' · TS ' + score.scorer + ' = <span style="font-size:14px">' + score.total + ' pts</span></div>';
  h += '<div style="font-size:10px;color:var(--text-sec);margin-top:4px">Green = matches admin result</div>';

  h += '</div>';
  return h;
}

async function deleteUser(id, name) {
  if (!confirm("Delete '" + name + "' and all their picks?")) return;
  try {
    await sb.from("group_picks").delete().eq("user_id", id);
    await sb.from("ko_picks").delete().eq("user_id", id);
    await sb.from("extras").delete().eq("user_id", id);
    await sb.from("users").delete().eq("id", id);
    await loadAllForLeaderboard();
    await loadAdminUsers();
    computeScores();
  } catch (e) { alert("Error: " + e.message); }
}

function adminOut() {
  document.getElementById("adm-main").style.display = "none";
  document.getElementById("adm-gate").style.display = "block";
}

async function changeAdmPw() {
  const np = (document.getElementById("adm-newpw").value || "").trim();
  if (!np) return;
  await sb.from("settings").upsert([{key: "admin_password", value: np}], {onConflict: "key"});
  settings.admin_password = np;
  document.getElementById("adm-newpw").value = "";
  document.getElementById("adm-saved").textContent = "Password changed.";
  setTimeout(() => { document.getElementById("adm-saved").textContent = ""; }, 2000);
}

async function toggleLock() {
  const cur = settings.force_locked === "true";
  const next = !cur ? "true" : "false";
  await sb.from("settings").upsert([{key: "force_locked", value: next}], {onConflict: "key"});
  settings.force_locked = next;
  renderAdm();
}

async function setTS() {
  const v = (document.getElementById("adm-ts").value || "").trim();
  await sb.from("admin_extras").upsert([{key: "top_scorer", value: v}], {onConflict: "key"});
  admExtras.top_scorer = v;
  document.getElementById("adm-saved").textContent = "Top scorer saved.";
  setTimeout(() => { document.getElementById("adm-saved").textContent = ""; }, 2000);
}

function admTab(t) {
  const map = {"groups":"adm-g-sec","knockout":"adm-ko-sec"};
  document.querySelectorAll(".pick-tab").forEach(b => {});  // admin uses same class
  // Toggle visibility
  Object.values(map).forEach(id => { const el = document.getElementById(id); if (el) el.style.display = "none"; });
  const el = document.getElementById(map[t]);
  if (el) el.style.display = "block";
  // Update tab styling
  const tabs = document.querySelectorAll("#pg-admin .pick-tab");
  tabs.forEach(b => b.classList.remove("on"));
  if (t === "groups" && tabs[0]) tabs[0].classList.add("on");
  if (t === "knockout" && tabs[1]) tabs[1].classList.add("on");
}

function renderAdm() {
  document.getElementById("lock-btn").textContent = settings.force_locked === "true" ? "Unlock predictions" : "Force lock";
  document.getElementById("lock-lbl").textContent = settings.force_locked === "true" ? "Predictions force-locked." : "";
  document.getElementById("adm-ts").value = admExtras.top_scorer || "";
  let h = '';
  Object.keys(GROUPS).forEach(g => {
    const complete = isGroupComplete(admGroupRes, g);
    const active = (g === aG);
    h += '<button class="stab' + (active ? ' on' : '') + (complete ? ' done' : '') + '" onclick="swAG(\'' + g + '\')">' + g + (complete ? ' ✓' : '') + '</button>';
  });
  document.getElementById("adm-gtabs").innerHTML = h;
  renderAGroup();
  renderAdmThirds();
  renderAdmKO();
}

function swAG(g) { aG = g; renderAdm(); }

function renderAGroup() {
  const displayOrder = getDisplayOrder(admGroupRes, aG);
  let h = '<div class="card"><div class="lbl">Actual Group ' + aG + ' final order</div>';
  displayOrder.forEach((team, idx) => {
    const pos = idx + 1;
    const status = pos === 1 ? "Winner" : pos === 2 ? "Runner-up" : pos === 3 ? "3rd" : "Eliminated";
    const upDisabled = (idx === 0);
    const downDisabled = (idx === 3);
    const rowBg = pos <= 2 ? "background:var(--success-bg)" : pos === 3 ? "background:var(--warn-bg)" : "background:var(--bg-secondary)";
    const teamEsc = team.replace(/'/g, "\\'");
    h += '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:0.5px solid var(--border);border-radius:8px;margin-bottom:5px;' + rowBg + '">';
    h += '<span style="font-weight:600;width:22px;color:var(--text-sec)">' + pos + '.</span>';
    h += '<div style="flex:1"><div style="font-weight:500">' + team + '</div><div style="font-size:11px;color:var(--text-sec)">' + status + '</div></div>';
    h += '<button onclick="adminMoveTeam(\'' + aG + '\',\'' + teamEsc + '\',-1)" ' + (upDisabled ? 'disabled' : '') + ' style="padding:5px 11px">↑</button>';
    h += '<button onclick="adminMoveTeam(\'' + aG + '\',\'' + teamEsc + '\',1)" ' + (downDisabled ? 'disabled' : '') + ' style="padding:5px 11px">↓</button>';
    h += '</div>';
  });
  h += '</div>';
  document.getElementById("adm-gcontent").innerHTML = h;
}

async function adminMoveTeam(g, teamName, direction) {
  const displayOrder = getDisplayOrder(admGroupRes, g);
  const idx = displayOrder.indexOf(teamName);
  if (idx === -1) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx > 3) return;
  [displayOrder[idx], displayOrder[newIdx]] = [displayOrder[newIdx], displayOrder[idx]];
  showSaving();
  displayOrder.forEach((team, i) => { admGroupRes["rank_" + g + "_" + (i+1)] = team; });
  // Invalidate thirds_advancing if needed
  const adv = (admGroupRes.thirds_advancing || "").split(",").filter(s => s);
  const validThirds = new Set(getThirds(admGroupRes).map(t => t.name));
  const stillValid = adv.filter(t => validThirds.has(t));
  if (stillValid.length !== adv.length) {
    admGroupRes.thirds_advancing = stillValid.join(",");
  }
  const rows = displayOrder.map((team, i) => ({
    match_id: "rank_" + g + "_" + (i+1), result: team
  }));
  try {
    await sb.from("admin_group_results").upsert(rows, {onConflict: "match_id"});
    if (stillValid.length !== adv.length) {
      await sb.from("admin_group_results").upsert([{
        match_id: "thirds_advancing", result: stillValid.join(",")
      }], {onConflict: "match_id"});
    }
  } catch (e) { console.error("adminMoveTeam", e); }
  renderAdm();
}

function renderAdmThirds() {
  const thirds = getThirds(admGroupRes);
  const advancing = new Set((admGroupRes.thirds_advancing || "").split(",").filter(s => s));
  let h = '<div class="card"><div class="lbl">Actual advancing thirds (' + advancing.size + '/8)</div>';
  if (thirds.length === 0) {
    h += '<div style="font-size:13px;color:var(--text-sec)">Complete all 12 group rankings first.</div>';
  } else {
    const sorted = thirds.slice().sort((a,b) => a.group.localeCompare(b.group));
    sorted.forEach(t => {
      const isSel = advancing.has(t.name);
      const btnDisabled = !isSel && advancing.size >= 8;
      const rowBg = isSel ? "background:var(--success-bg)" : "background:var(--bg-secondary)";
      const teamEsc = t.name.replace(/'/g, "\\'");
      h += '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:0.5px solid var(--border);border-radius:8px;margin-bottom:5px;' + rowBg + '">';
      h += '<span style="font-weight:600;font-size:12px;width:22px;color:var(--text-sec)">' + t.group + '</span>';
      h += '<span style="flex:1;font-size:14px;font-weight:500">' + t.name + '</span>';
      h += '<button onclick="adminToggleThird(\'' + teamEsc + '\')" ' + (btnDisabled ? 'disabled' : '') + ' style="padding:5px 12px;background:' + (isSel ? 'var(--primary)' : '#fff') + ';color:' + (isSel ? '#fff' : 'var(--text)') + ';border-color:' + (isSel ? 'var(--primary)' : 'var(--border-strong)') + '">' + (isSel ? '✓ In' : 'Out') + '</button>';
      h += '</div>';
    });
  }
  h += '</div>';
  document.getElementById("adm-gstandings").innerHTML = h;
}

async function adminToggleThird(name) {
  const cur = (admGroupRes.thirds_advancing || "").split(",").filter(s => s);
  let next;
  if (cur.includes(name)) next = cur.filter(t => t !== name);
  else { if (cur.length >= 8) return; next = cur.concat([name]); }
  showSaving();
  admGroupRes.thirds_advancing = next.join(",");
  try {
    await sb.from("admin_group_results").upsert([{
      match_id: "thirds_advancing", result: next.join(",")
    }], {onConflict: "match_id"});
  } catch (e) { console.error("adminToggleThird", e); }
  renderAdm();
}

function renderAdmKO() {
  const bracket = buildBracket(admGroupRes, admKoRes);
  let h = '';
  const rounds = [
    {label:"Round of 32",    matches: bracket.r32},
    {label:"Round of 16",    matches: bracket.r16},
    {label:"Quarter-finals", matches: bracket.qf},
    {label:"Semi-finals",    matches: bracket.sf},
    {label:"Third place",    matches: [bracket.bronze]},
    {label:"Final",          matches: [bracket.final]}
  ];
  rounds.forEach(({label, matches}) => {
    h += '<div class="round-hdr">' + label + '</div>';
    matches.forEach(m => {
      const isTBD = /Winner|loser|TBD|SF|3rd /.test(m.home) || /Winner|loser|TBD|SF|3rd /.test(m.away);
      const sel = admKoRes[m.id] || null;
      const hCls = "ko-tm" + (sel === m.home ? " sel" : "") + (isTBD ? " tbd" : "");
      const aCls = "ko-tm" + (sel === m.away ? " sel" : "") + (isTBD ? " tbd" : "");
      const hEsc = m.home.replace(/'/g, "\\'");
      const aEsc = m.away.replace(/'/g, "\\'");
      const hClk = !isTBD ? 'onclick="setAdmKo(\'' + m.id + '\',\'' + hEsc + '\')"' : "";
      const aClk = !isTBD ? 'onclick="setAdmKo(\'' + m.id + '\',\'' + aEsc + '\')"' : "";
      h += '<div class="ko-match' + (isTBD ? " pending" : "") + '"><div class="ko-teams-row"><div class="' + hCls + '" ' + hClk + '>' + m.home + '</div><div class="ko-vs">vs</div><div class="' + aCls + '" ' + aClk + '>' + m.away + '</div></div></div>';
    });
  });
  document.getElementById("adm-ko-content").innerHTML = h;
}

async function setAdmKo(id, team) {
  showSaving();
  admKoRes[id] = team;
  try {
    await sb.from("admin_ko_results").upsert([{match_id: id, winner: team}], {onConflict: "match_id"});
  } catch (e) { console.error("setAdmKo", e); }
  renderAdmKO();
}

async function adminRecalc() {
  await loadAdminResults();
  await loadAllForLeaderboard();
  computeScores();
  renderAdm();
  document.getElementById("adm-saved").textContent = "Scores recalculated.";
  setTimeout(() => { document.getElementById("adm-saved").textContent = ""; }, 2000);
}

// ====== SITE PASSWORD GATE ======

const SITE_PASSWORD = "S426";

function showAppAfterGate() {
  document.getElementById("site-gate").style.display = "none";
  boot();
}

function checkSitePw() {
  const v = (document.getElementById("site-pw").value || "").trim();
  if (v === SITE_PASSWORD) {
    localStorage.setItem("wc2026_site_pw_ok", "1");
    showAppAfterGate();
  } else {
    document.getElementById("site-pw-msg").textContent = "Wrong code.";
  }
}

if (localStorage.getItem("wc2026_site_pw_ok") === "1") {
  document.addEventListener("DOMContentLoaded", showAppAfterGate);
} else {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("site-gate").style.display = "block";
  });
}
