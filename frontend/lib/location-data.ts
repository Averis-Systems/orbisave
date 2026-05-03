/**
 * Static administrative boundary data for OrbiSave's three operating countries.
 * Source: Kenya KNBS, Rwanda NISR, Ghana GSS.
 * Boundaries are stable government divisions that change every 5-10 years.
 * Update manually if boundaries change — no API dependency needed.
 */

export type CountryCode = 'kenya' | 'rwanda' | 'ghana'

export interface CountryLocation {
  label: string
  currency: string
  phoneCode: string
  phonePattern: RegExp
  phoneHint: string
  level1Label: string // e.g. "County", "Province", "Region"
  level2Label: string // e.g. "Sub-county", "District"
  divisions: Record<string, string[]>
}

export const LOCATION_DATA: Record<CountryCode, CountryLocation> = {
  kenya: {
    label: 'Kenya',
    currency: 'KES',
    phoneCode: '+254',
    phonePattern: /^\+254[17]\d{8}$/,
    phoneHint: '+254 7XX XXX XXX or +254 1XX XXX XXX',
    level1Label: 'County',
    level2Label: 'Sub-county',
    divisions: {
      'Nairobi': ['Westlands', 'Dagoretti North', 'Dagoretti South', 'Langata', 'Kibra', 'Roysambu', 'Kasarani', 'Ruaraka', 'Embakasi South', 'Embakasi North', 'Embakasi Central', 'Embakasi East', 'Embakasi West', 'Makadara', 'Kamukunji', 'Starehe', 'Mathare'],
      'Mombasa': ['Changamwe', 'Jomvu', 'Kisauni', 'Nyali', 'Likoni', 'Mvita'],
      'Kwale': ['Msambweni', 'Lunga Lunga', 'Matuga', 'Kinango'],
      'Kilifi': ['Kilifi North', 'Kilifi South', 'Kaloleni', 'Rabai', 'Ganze', 'Malindi', 'Magarini'],
      'Tana River': ['Garsen', 'Galole', 'Bura'],
      'Lamu': ['Lamu East', 'Lamu West'],
      'Taita-Taveta': ['Taveta', 'Wundanyi', 'Mwatate', 'Voi'],
      'Garissa': ['Garissa Township', 'Balambala', 'Lagdera', 'Dadaab', 'Fafi', 'Ijara'],
      'Wajir': ['Wajir North', 'Wajir East', 'Tarbaj', 'Wajir West', 'Eldas', 'Wajir South'],
      'Mandera': ['Mandera East', 'Banissa', 'Mandera North', 'Mandera South', 'Mandera West', 'Lafey'],
      'Marsabit': ['Moyale', 'North Horr', 'Saku', 'Laisamis'],
      'Isiolo': ['Isiolo North', 'Isiolo South'],
      'Meru': ['Igembe South', 'Igembe Central', 'Igembe North', 'Tigania West', 'Tigania East', 'Central Imenti', 'Buuri', 'South Imenti', 'North Imenti'],
      'Tharaka-Nithi': ['Maara', 'Chuka/Igambang\'ombe', 'Tharaka'],
      'Embu': ['Manyatta', 'Runyenjes', 'Mbeere South', 'Mbeere North'],
      'Kitui': ['Mwingi North', 'Mwingi West', 'Mwingi Central', 'Kitui West', 'Kitui Rural', 'Kitui Central', 'Kitui East', 'Kitui South'],
      'Machakos': ['Masinga', 'Yatta', 'Kangundo', 'Matungulu', 'Kathiani', 'Mavoko', 'Machakos Town', 'Mwala'],
      'Makueni': ['Mbooni', 'Kilome', 'Kaiti', 'Makueni', 'Kibwezi West', 'Kibwezi East'],
      'Nyandarua': ['Kinangop', 'Kipipiri', 'Ol Kalou', 'Ol Jorok', 'Ndaragua'],
      'Nyeri': ['Tetu', 'Kieni', 'Mathira', 'Othaya', 'Mukurwe-ini', 'Nyeri Town'],
      'Kirinyaga': ['Mwea', 'Gichugu', 'Ndia', 'Kirinyaga Central'],
      'Murang\'a': ['Kangema', 'Mathioya', 'Kiharu', 'Kigumo', 'Maragwa', 'Kandara', 'Gatanga'],
      'Kiambu': ['Gatundu South', 'Gatundu North', 'Juja', 'Thika Town', 'Ruiru', 'Githunguri', 'Kiambu', 'Kiambaa', 'Kabete', 'Kikuyu', 'Limuru', 'Lari'],
      'Turkana': ['Turkana North', 'Turkana West', 'Turkana Central', 'Loima', 'Turkana South', 'Turkana East'],
      'West Pokot': ['Pokot South', 'West Pokot', 'Kacheliba', 'Kapenguria'],
      'Samburu': ['Samburu West', 'Samburu North', 'Samburu East'],
      'Trans-Nzoia': ['Kwanza', 'Endebess', 'Saboti', 'Kiminini', 'Cherangany'],
      'Uasin Gishu': ['Soy', 'Turbo', 'Moiben', 'Ainabkoi', 'Kapseret', 'Kesses'],
      'Elgeyo-Marakwet': ['Marakwet East', 'Marakwet West', 'Keiyo North', 'Keiyo South'],
      'Nandi': ['Tinderet', 'Aldai', 'Nandi Hills', 'Chesumei', 'Emgwen', 'Mosop'],
      'Baringo': ['Tiaty', 'Baringo North', 'Baringo Central', 'Baringo South', 'Mogotio', 'Eldama Ravine'],
      'Laikipia': ['Laikipia West', 'Laikipia East', 'Laikipia North'],
      'Nakuru': ['Molo', 'Njoro', 'Naivasha', 'Gilgil', 'Kuresoi South', 'Kuresoi North', 'Subukia', 'Rongai', 'Bahati', 'Nakuru Town West', 'Nakuru Town East'],
      'Narok': ['Kilgoris', 'Emurua Dikirr', 'Narok North', 'Narok East', 'Narok South', 'Narok West'],
      'Kajiado': ['Kajiado North', 'Kajiado Central', 'Kajiado East', 'Kajiado West', 'Kajiado South'],
      'Kericho': ['Kipkelion East', 'Kipkelion West', 'Ainamoi', 'Bureti', 'Belgut', 'Sigowet/Soin'],
      'Bomet': ['Sotik', 'Chepalungu', 'Bomet East', 'Bomet Central', 'Konoin'],
      'Kakamega': ['Lugari', 'Likuyani', 'Malava', 'Lurambi', 'Navakholo', 'Mumias West', 'Mumias East', 'Matungu', 'Butere', 'Khwisero', 'Shinyalu', 'Ikolomani'],
      'Vihiga': ['Vihiga', 'Sabatia', 'Hamisi', 'Luanda', 'Emuhaya'],
      'Bungoma': ['Mt. Elgon', 'Sirisia', 'Kabuchai', 'Bumula', 'Kanduyi', 'Webuye East', 'Webuye West', 'Kimilili', 'Tongaren'],
      'Busia': ['Teso North', 'Teso South', 'Nambale', 'Matayos', 'Butula', 'Funyula', 'Budalangi'],
      'Siaya': ['Ugenya', 'Ugunja', 'Alego Usonga', 'Gem', 'Bondo', 'Rarieda'],
      'Kisumu': ['Kisumu East', 'Kisumu West', 'Kisumu Central', 'Seme', 'Nyando', 'Muhoroni', 'Nyakach'],
      'Homa Bay': ['Kasipul', 'Kabondo Kasipul', 'Karachuonyo', 'Rangwe', 'Homa Bay Town', 'Ndhiwa', 'Suba North', 'Suba South'],
      'Migori': ['Rongo', 'Awendo', 'Suna East', 'Suna West', 'Uriri', 'Nyatike', 'Kuria West', 'Kuria East'],
      'Kisii': ['Bonchari', 'South Mugirango', 'Bomachoge Borabu', 'Bobasi', 'Bomachoge Chache', 'Nyaribari Masaba', 'Nyaribari Chache', 'Kitutu Chache North', 'Kitutu Chache South'],
      'Nyamira': ['Kitutu Masaba', 'West Mugirango', 'North Mugirango', 'Borabu'],
    },
  },

  rwanda: {
    label: 'Rwanda',
    currency: 'RWF',
    phoneCode: '+250',
    phonePattern: /^\+250\d{9}$/,
    phoneHint: '+250 7XX XXX XXX',
    level1Label: 'Province',
    level2Label: 'District',
    divisions: {
      'Kigali': ['Gasabo', 'Kicukiro', 'Nyarugenge'],
      'Eastern Province': ['Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana'],
      'Northern Province': ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'],
      'Southern Province': ['Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango'],
      'Western Province': ['Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro'],
    },
  },

  ghana: {
    label: 'Ghana',
    currency: 'GHS',
    phoneCode: '+233',
    phonePattern: /^\+233\d{9}$/,
    phoneHint: '+233 2X XXX XXXX',
    level1Label: 'Region',
    level2Label: 'District',
    divisions: {
      'Greater Accra': ['Accra Metropolitan', 'Tema Municipal', 'Ga East Municipal', 'Ga West Municipal', 'Ga Central Municipal', 'Ga South Municipal', 'Adenta Municipal', 'Adentan Municipal', 'Ashaiman Municipal', 'Ledzokuku Municipal', 'Kpone Katamanso', 'La Nkwantanang Madina', 'La Dadekotopon', 'Ningo Prampram', 'Shai Osudoku'],
      'Ashanti': ['Kumasi Metropolitan', 'Obuasi Municipal', 'Ejisu Municipal', 'Kwabre East Municipal', 'Asante Akim North Municipal', 'Asante Akim Central Municipal', 'Asante Akim South', 'Bosomtwe', 'Atwima Kwanwoma', 'Atwima Nwabiagya', 'Atwima Nwabiagya North', 'Ahafo Ano South West', 'Ahafo Ano South East', 'Ahafo Ano North East', 'Ahafo Ano North West', 'Afigya Kwabre South', 'Afigya Kwabre North', 'Amansie Central', 'Amansie South', 'Amansie West', 'Bekwai Municipal', 'Bosome Freho', 'Juaben Municipal', 'Offinso Municipal', 'Offinso North', 'Sekyere Afram Plains', 'Sekyere Kumawu', 'Sekyere Central', 'Sekyere East', 'Sekyere South'],
      'Western': ['Sekondi-Takoradi Metropolitan', 'Ahanta West Municipal', 'Effia Kwesimintsim Municipal', 'Ellembelle', 'Jomoro Municipal', 'Mpohor', 'Nzema East Municipal', 'Prestea Huni-Valley Municipal', 'Shama', 'Tarkwa-Nsuaem Municipal', 'Wassa Amenfi Central', 'Wassa Amenfi East', 'Wassa Amenfi West', 'Wassa East'],
      'Western North': ['Aowin Municipal', 'Bia East', 'Bia West', 'Bibiani-Anhwiaso-Bekwai Municipal', 'Bodi', 'Juaboso', 'Sefwi Akontombra', 'Sefwi Wiawso Municipal', 'Suaman'],
      'Central': ['Cape Coast Metropolitan', 'Abura Asebu Kwamankese', 'Agona East', 'Agona West Municipal', 'Ajumako Enyan Essiam', 'Asikuma Odoben Brakwa', 'Assin Foso Municipal', 'Assin North Municipal', 'Assin South', 'Awutu Senya East Municipal', 'Awutu Senya West Municipal', 'Efutu Municipal', 'Ekumfi', 'Gomoa Central', 'Gomoa East', 'Gomoa West', 'Hemang Lower Denkyira', 'Komenda Edina Eguafo Abrem Municipal', 'Mfantsiman Municipal', 'Twifo Atti-Morkwa', 'Twifo Hemang Lower Denkyira', 'Upper Denkyira East Municipal', 'Upper Denkyira West'],
      'Eastern': ['New Juaben South Municipal', 'New Juaben North Municipal', 'Kwaebibirem Municipal', 'Akyemansa', 'Asene Manso Akroso', 'Atiwa East', 'Atiwa West', 'Ayensuano', 'Birim Central Municipal', 'Birim North', 'Birim South', 'Denkyembour', 'Fanteakwa North', 'Fanteakwa South', 'Lower Manya Krobo Municipal', 'Abuakwa North Municipal', 'Abuakwa South Municipal', 'Akuapem North Municipal', 'Akuapem South', 'Asante Akim South', 'Upper Manya Krobo', 'Upper West Akyem', 'West Akyem Municipal', 'Yilo Krobo Municipal'],
      'Volta': ['Ho Municipal', 'Ho West', 'Hohoe Municipal', 'Afadjato South', 'Agotime Ziope', 'Akatsi North', 'Akatsi South', 'Ave Afiadenyigba', 'Central Tongu', 'Adaklu', 'Biakoye', 'Keta Municipal', 'Ketu North Municipal', 'Ketu South Municipal', 'Kpando Municipal', 'Krachi East', 'Krachi Nchumuru', 'Krachi West', 'North Dayi', 'North Tongu', 'Nkwanta North', 'Nkwanta South Municipal', 'Oti', 'South Dayi'],
      'Oti': ['Biakoye', 'Guan', 'Jasikan', 'Kadjebi', 'Krachi East', 'Krachi Nchumuru', 'Krachi West', 'Nkwanta North', 'Nkwanta South Municipal'],
      'Brong-Ahafo': ['Sunyani Municipal', 'Sunyani West', 'Berekum East Municipal', 'Berekum West', 'Dormaa Central Municipal', 'Dormaa East', 'Dormaa West', 'Jaman North', 'Jaman South Municipal', 'Tain', 'Wenchi Municipal'],
      'Bono': ['Sunyani Municipal', 'Sunyani West', 'Berekum East Municipal', 'Berekum West', 'Dormaa Central Municipal', 'Dormaa East', 'Dormaa West', 'Jaman North', 'Jaman South Municipal', 'Tain', 'Wenchi Municipal'],
      'Bono East': ['Atebubu-Amantin Municipal', 'Kintampo North Municipal', 'Kintampo South', 'Nkoranza North', 'Nkoranza South Municipal', 'Pru East', 'Pru West', 'Sene East', 'Sene West', 'Techiman Municipal', 'Techiman North'],
      'Ahafo': ['Asunafo North Municipal', 'Asunafo South', 'Asutifi North', 'Asutifi South', 'Tano North Municipal', 'Tano South Municipal'],
      'Northern': ['Tamale Metropolitan', 'Sagnarigu Municipal', 'Tolon', 'Kumbungu', 'Nanton', 'Mion', 'Savelugu Municipal', 'Karaga', 'Gushegu Municipal', 'Nanumba North Municipal', 'Nanumba South', 'Zabzugu', 'Tatale Sanguli', 'Yendi Municipal', 'Mion'],
      'Savannah': ['Bole', 'Central Gonja', 'East Gonja Municipal', 'North East Gonja', 'North Gonja', 'Sawla Tuna Kalba', 'West Gonja Municipal'],
      'North East': ['Bunkpurugu Nakpayili', 'Chereponi', 'East Mamprusi Municipal', 'Mamprugu Moagduri', 'West Mamprusi Municipal', 'Yunyoo Nasuan'],
      'Upper East': ['Bolgatanga Municipal', 'Bawku Municipal', 'Bawku West', 'Binduri', 'Bongo', 'Builsa North Municipal', 'Builsa South', 'Garu', 'Kassena Nankana East', 'Kassena Nankana West', 'Nabdam', 'Pusiga', 'Talensi', 'Tempane'],
      'Upper West': ['Wa Municipal', 'Daffiama Bussie Issa', 'Jirapa Municipal', 'Lambussie Karni', 'Lawra Municipal', 'Nadowli-Kaleo', 'Nandom Municipal', 'Sissala East Municipal', 'Sissala West', 'Wa East', 'Wa West'],
    },
  },
}

/** Returns the currency symbol/code for a given country */
export function getCurrency(country: CountryCode): string {
  return LOCATION_DATA[country].currency
}

/** Returns all level-1 division names (counties, provinces, regions) */
export function getLevel1(country: CountryCode): string[] {
  return Object.keys(LOCATION_DATA[country].divisions)
}

/** Returns level-2 divisions for a selected level-1 area */
export function getLevel2(country: CountryCode, level1: string): string[] {
  return LOCATION_DATA[country].divisions[level1] || []
}
