const PREDEFINED_LISTS = {
  "Gündem": [
    { name: "Anadolu Ajansı", url: "https://www.aa.com.tr/tr/rss/default?cat=guncel", active: true },
    { name: "BBC Türkçe", url: "https://feeds.bbci.co.uk/turkce/rss.xml", active: true },
    { name: "CNN Türk", url: "https://www.cnnturk.com/feed/rss/all/news", active: true },
    { name: "GZT", url: "https://www.gzt.com/rss", active: true },
    { name: "Habertürk", url: "https://www.haberturk.com/rss", active: true }
  ],
  "Ekonomi ve Finans": [
    { name: "Bloomberg HT", url: "https://www.bloomberght.com/rss", active: true },
    { name: "Ekonomi Gazetesi", url: "https://www.ekonomigazetesi.com/rss.xml", active: true },
    { name: "Forbes Türkiye", url: "https://www.forbes.com.tr/rss", active: true },
    { name: "Foreks", url: "https://www.foreks.com/rss/", active: true },
    { name: "CNBC-e", url: "https://www.cnbce.com/rss", active: true }
  ],
  "Bilim": [
    { name: "Arkeofili", url: "https://arkeofili.com/feed/", active: true },
    { name: "Evrim Ağacı", url: "https://evrimagaci.org/rss.xml", active: true },
    { name: "Independent Bilim", url: "https://www.indyturk.com/taxonomy/term/48791/%2A/feed", active: true },
    { name: "Popular Science", url: "https://popsci.com.tr/feed/", active: true },
    { name: "Bilim Günlüğü", url: "https://www.bilimgunlugu.com/feed/", active: true }
  ],
  "Teknoloji": [
    { name: "CHIP Online", url: "https://www.chip.com.tr/rss", active: true },
    { name: "Donanım Haber", url: "https://www.donanimhaber.com/rss/tum/", active: true },
    { name: "Hardware Plus", url: "https://hwp.com.tr/feed", active: true },
    { name: "ShiftDelete", url: "https://shiftdelete.net/feed", active: true },
    { name: "Technopat", url: "https://www.technopat.net/feed/", active: true }
  ],
  "Eğlence": [
    { name: "Beyaz Perde", url: "https://www.beyazperde.com/rss/haberler.xml", active: true },
    { name: "IGN Türkiye", url: "https://tr.ign.com/feed.xml", active: true },
    { name: "ListeList", url: "https://listelist.com/feed/", active: true },
    { name: "Merlin'in Kazanı", url: "https://www.merlininkazani.com/feed/", active: true },
    { name: "Onedio", url: "https://onedio.com/Publisher/publisher-daily.rss", active: true }
  ],
  "Kültür ve Sanat": [
    { name: "Kilikya Dergisi", url: "https://dergipark.org.tr/tr/pub/kilikya/rss/lastissue/tr", active: true },
    { name: "Gazete Sanat", url: "https://www.gazetesanat.com/feed", active: true },
    { name: "Mitoloji", url: "https://mitoloji.org.tr/feed/", active: true },
    { name: "Edebiyat Haber", url: "https://www.edebiyathaber.net/feed/", active: true },
    { name: "Vesaire", url: "https://vesaire.press/feed/", active: true }
  ],
  "Spor": [
    { name: "A Spor", url: "https://www.aspor.com.tr/rss/anasayfa.xml", active: true },
    { name: "Fotospor", url: "https://www.fotospor.com/feed/rss_sondakika.xml", active: true },
    { name: "NTV Spor", url: "https://www.ntvspor.net/rss/anasayfa", active: true },
    { name: "Fotomaç", url: "https://www.fotomac.com.tr/rss/son24saat.xml", active: true },
    { name: "AjansSpor", url: "https://ajansspor.com/rss", active: true }
  ],
  "K4SATURA": [
    { name: 'Defence Turk', url: 'https://www.defenceturk.net/feed', active: true },
    { name: 'Defense Feeds', url: 'https://defensefeeds.com/feed/', active: true },
    { name: 'Defense News', url: 'https://www.defensenews.com/arc/outboundfeeds/rss/category/naval/?outputType=xml', active: true },
    { name: 'MarineLink', url: 'https://www.marinelink.com/news/rss', active: true },
    { name: 'Naval Analyses', url: 'https://www.navalanalyses.com/feeds/posts/default', active: true },
    { name: 'Navy Lookout', url: 'https://www.navylookout.com/feed/', active: true },
    { name: 'Naval News', url: 'https://www.navalnews.com/feed/', active: true },
    { name: 'Naval Technology', url: 'https://www.naval-technology.com/feed/', active: true },
    { name: 'Naval Today', url: 'https://www.navaltoday.com/feed/', active: true },
    { name: 'Navy Times', url: 'https://www.navytimes.com/arc/outboundfeeds/rss/category/news/?outputType=xml', active: true },
    { name: 'Sanayi Gazetesi', url: 'https://sanayigazetesi.com.tr/kategori/savunma-haberleri/feed/', active: true },
    { name: 'SavunmaSanayiST', url: 'https://www.savunmasanayist.com/feed/', active: true },
    { name: 'SavunmaTR', url: 'https://www.savunmatr.com/feed/', active: true },
    { name: 'Seapower Magazine', url: 'https://seapowermagazine.org/feed/', active: true },
    { name: 'U.S. Navy Press', url: 'https://www.navy.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=2&Site=1067&max=10', active: true }
  ]
};