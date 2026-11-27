/**
 * ============================================================
 * INVITATION DIGITAL: H&M - CENTRAL INVITATION CONFIGURATION
 * Single Source of Truth for all wedding details.
 * ============================================================
 *
 * HOW TO USE:
 * - Replace placeholder values below with real wedding details.
 * - Do NOT hard-code details in individual React components.
 * - Leave fields blank ("") or as placeholders if information is not yet available.
 */

export const invitationData = {
  // --- 1. COUPLE INFORMATION ---

  // --- 1. COUPLE INFORMATION ---
  couple: {
    groom: {
      nameKhmer: "ឡាយ តុងហួរ",
      nameEnglish: "LAY TONGHOUR",
      initial: "H",
      fatherKhmer: "ឡាយ សាន",
      motherKhmer: "ថាប់ វណ្ណឌី",
      parentsKhmer: "លោកឪពុក ... និង អ្នកម្តាយ ...",
      parentsEnglish: "Mr. ... & Mrs. ...",
      photo: "/assets/images/couple/tonghour.webp",
      originalPhoto: "/assets/images/couple/tonghour.jpg",
    },
    bride: {
      nameKhmer: "ថា ស៊ីវមិញ",
      nameEnglish: "THA SIVMINH",
      initial: "M",
      fatherKhmer: "ទាវ វណ្ណថា",
      motherKhmer: "ប៊ុន យឿត",
      parentsKhmer: "លោកឪពុក ... និង អ្នកម្តាយ ...",
      parentsEnglish: "Mr. ... & Mrs. ...",
      photo: "/assets/images/couple/sivminh.webp",
      originalPhoto: "/assets/images/couple/sivminh.jpg",
    },
    coverPhoto: "",
  },

  // --- 2. WEDDING DATE & COUNTDOWN ---
  date: {
    targetDateISO: "2026-12-18T07:00:00+07:00",
    displayDateKhmer: "ថ្ងៃសុក្រ ទី១៨ ខែធ្នូ ឆ្នាំ២០២៦",
    displayDateEnglish: "Friday, December 18, 2026",
    displayShortDate: "18 . 12 . 2026",
  },

  // --- 3. SCHEDULE OF CEREMONIES ---
  // --- 3. SCHEDULE OF CEREMONIES ---
  schedule: [
    // Row 1 (Top Track - Above Line)
    {
      id: "ceremony-01",
      row: 1,
      icon: "betel-tray",
      time: "05:40 AM",
      timeKhmer: "០៥:៤០ ព្រឹក",
      titleKhmer: "យកពេលាកូនប្រុស",
      titleEnglish: "Groom's Auspicious Timing",
    },
    {
      id: "ceremony-02",
      row: 1,
      icon: "krong-pali",
      time: "06:30 AM",
      timeKhmer: "០៦:៣០ ព្រឹក",
      titleKhmer: "ពិធីក្រុងពាលី",
      titleEnglish: "Krong Pali Offering Ceremony",
    },
    {
      id: "ceremony-03",
      row: 1,
      icon: "procession",
      time: "07:00 AM",
      timeKhmer: "០៧:០០ ព្រឹក",
      titleKhmer: "ពិធីហែជំនូន",
      titleEnglish: "Groom's Procession",
    },
    // Row 2 (Top Track - Below Line)
    {
      id: "ceremony-04",
      row: 2,
      icon: "scissors",
      time: "09:00 AM",
      timeKhmer: "០៩:០០ ព្រឹក",
      titleKhmer: "ពិធីកាត់សក់បង្កក់សិរី",
      titleEnglish: "Hair Cutting Blessing Ceremony",
    },
    {
      id: "ceremony-05",
      row: 2,
      icon: "sword-hands",
      time: "11:00 AM",
      timeKhmer: "១១:០០ ថ្ងៃត្រង់",
      titleKhmer: "ពិធីសែនចងដៃ និងពិសាអាហារថ្ងៃត្រង់",
      titleEnglish: "Knot-Tying Blessing & Lunch",
    },
    {
      id: "ceremony-06",
      row: 2,
      icon: "umbrellas",
      time: "01:00 PM",
      timeKhmer: "០១:០០ ល្ងាច",
      titleKhmer: "កាត់ខាន់ស្លា",
      titleEnglish: "Kat Khan Sla Ceremony",
    },
    // Row 3 (Evening Track)
    {
      id: "ceremony-07",
      row: 3,
      icon: "monks-blessing",
      time: "02:00 PM",
      timeKhmer: "០២:០០ ល្ងាច",
      titleKhmer: "សូត្រមន្ត",
      titleEnglish: "Monks' Blessing Chanting",
    },
    {
      id: "ceremony-08",
      row: 3,
      icon: "champagne",
      time: "05:00 PM",
      timeKhmer: "០៥:០០ ល្ងាច",
      titleKhmer: "ពិសាភោជនីយអាហារ",
      titleEnglish: "Evening Wedding Banquet",
    },
  ],

  // --- 4. VENUE & LOCATION ---
  venue: {
    nameKhmer: "ក្រុងប៉ោយប៉ែត",
    nameEnglish: "Poipet City",
    addressKhmer: "ក្រុងប៉ោយប៉ែត ខេត្តបន្ទាយមានជ័យ",
    addressEnglish: "Poipet City, Banteay Meanchey Province",
    latitude: 13.6614444,
    longitude: 102.56125,
    googleMapsUrl:
      "https://www.google.com/maps/place/13%C2%B039'41.2%22N+102%C2%B033'40.5%22E/@13.6614496,102.5586751,17z/data=!3m1!4b1!4m4!3m3!8m2!3d13.6614444!4d102.56125!5m1!1e2?entry=ttu&g_ep=EgoyMDI2MTExNy4wIKXMDSoASAFQAw%3D%3D",
    directionsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=13.6614444,102.56125&travelmode=driving",
    googleMapsEmbedUrl:
      "https://www.google.com/maps?q=13.6614444,102.56125&hl=km&z=16&output=embed",
  },

  // --- 5. PRE-WEDDING PHOTO GALLERY (25 ITEMS) ---
  // High-performance image architecture:
  // - thumbnail: lightweight WebP (~30-50KB) for fast, responsive gallery grid
  // - src: optimized WebP (~200-450KB, max 1920px) for crisp Lightbox modal
  // - original: raw high-res JPEG (~15-20MB) preserved untouched as fallback
  gallery: [
    {
      id: "photo-01",
      src: "/assets/images/gallery/optimized/photo-01.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-01.webp",
      original: "/assets/images/gallery/original/photo-01.jpg",
      placeholderLabelKhmer: "រូបថត ០១",
      placeholderLabelEnglish: "Photo 01",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ០១",
      captionEnglish: "Pre-Wedding Memory 01",
      alt: "Pre-wedding photograph 01",
    },
    {
      id: "photo-02",
      src: "/assets/images/gallery/optimized/photo-02.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-02.webp",
      original: "/assets/images/gallery/original/photo-02.jpg",
      placeholderLabelKhmer: "រូបថត ០២",
      placeholderLabelEnglish: "Photo 02",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ០២",
      captionEnglish: "Pre-Wedding Memory 02",
      alt: "Pre-wedding photograph 02",
    },
    {
      id: "photo-03",
      src: "/assets/images/gallery/optimized/photo-03.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-03.webp",
      original: "/assets/images/gallery/original/photo-03.jpg",
      placeholderLabelKhmer: "រូបថត ០៣",
      placeholderLabelEnglish: "Photo 03",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ០៣",
      captionEnglish: "Pre-Wedding Memory 03",
      alt: "Pre-wedding photograph 03",
    },
    {
      id: "photo-04",
      src: "/assets/images/gallery/optimized/photo-04.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-04.webp",
      original: "/assets/images/gallery/original/photo-04.jpg",
      placeholderLabelKhmer: "រូបថត ០៤",
      placeholderLabelEnglish: "Photo 04",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ០៤",
      captionEnglish: "Pre-Wedding Memory 04",
      alt: "Pre-wedding photograph 04",
    },
    {
      id: "photo-05",
      src: "/assets/images/gallery/optimized/photo-05.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-05.webp",
      original: "/assets/images/gallery/original/photo-05.jpg",
      placeholderLabelKhmer: "រូបថត ០៥",
      placeholderLabelEnglish: "Photo 05",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ០៥",
      captionEnglish: "Pre-Wedding Memory 05",
      alt: "Pre-wedding photograph 05",
    },
    {
      id: "photo-06",
      src: "/assets/images/gallery/optimized/photo-06.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-06.webp",
      original: "/assets/images/gallery/original/photo-06.jpg",
      placeholderLabelKhmer: "រូបថត ០៦",
      placeholderLabelEnglish: "Photo 06",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ០៦",
      captionEnglish: "Pre-Wedding Memory 06",
      alt: "Pre-wedding photograph 06",
    },
    {
      id: "photo-07",
      src: "/assets/images/gallery/optimized/photo-07.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-07.webp",
      original: "/assets/images/gallery/original/photo-07.jpg",
      placeholderLabelKhmer: "រូបថត ០៧",
      placeholderLabelEnglish: "Photo 07",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ០៧",
      captionEnglish: "Pre-Wedding Memory 07",
      alt: "Pre-wedding photograph 07",
    },
    {
      id: "photo-08",
      src: "/assets/images/gallery/optimized/photo-08.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-08.webp",
      original: "/assets/images/gallery/original/photo-08.jpg",
      placeholderLabelKhmer: "រូបថត ០៨",
      placeholderLabelEnglish: "Photo 08",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ០៨",
      captionEnglish: "Pre-Wedding Memory 08",
      alt: "Pre-wedding photograph 08",
    },
    {
      id: "photo-09",
      src: "/assets/images/gallery/optimized/photo-09.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-09.webp",
      original: "/assets/images/gallery/original/photo-09.jpg",
      placeholderLabelKhmer: "រូបថត ០៩",
      placeholderLabelEnglish: "Photo 09",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ០៩",
      captionEnglish: "Pre-Wedding Memory 09",
      alt: "Pre-wedding photograph 09",
    },
    {
      id: "photo-10",
      src: "/assets/images/gallery/optimized/photo-10.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-10.webp",
      original: "/assets/images/gallery/original/photo-10.jpg",
      placeholderLabelKhmer: "រូបថត ១០",
      placeholderLabelEnglish: "Photo 10",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ១០",
      captionEnglish: "Pre-Wedding Memory 10",
      alt: "Pre-wedding photograph 10",
    },
    {
      id: "photo-11",
      src: "/assets/images/gallery/optimized/photo-11.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-11.webp",
      original: "/assets/images/gallery/original/photo-11.jpg",
      placeholderLabelKhmer: "រូបថត ១១",
      placeholderLabelEnglish: "Photo 11",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ១១",
      captionEnglish: "Pre-Wedding Memory 11",
      alt: "Pre-wedding photograph 11",
    },
    {
      id: "photo-12",
      src: "/assets/images/gallery/optimized/photo-12.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-12.webp",
      original: "/assets/images/gallery/original/photo-12.jpg",
      placeholderLabelKhmer: "រូបថត ១២",
      placeholderLabelEnglish: "Photo 12",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ១២",
      captionEnglish: "Pre-Wedding Memory 12",
      alt: "Pre-wedding photograph 12",
    },
    {
      id: "photo-13",
      src: "/assets/images/gallery/optimized/photo-13.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-13.webp",
      original: "/assets/images/gallery/original/photo-13.jpg",
      placeholderLabelKhmer: "រូបថត ១៣",
      placeholderLabelEnglish: "Photo 13",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ១៣",
      captionEnglish: "Pre-Wedding Memory 13",
      alt: "Pre-wedding photograph 13",
    },
    {
      id: "photo-14",
      src: "/assets/images/gallery/optimized/photo-14.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-14.webp",
      original: "/assets/images/gallery/original/photo-14.jpg",
      placeholderLabelKhmer: "រូបថត ១៤",
      placeholderLabelEnglish: "Photo 14",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ១៤",
      captionEnglish: "Pre-Wedding Memory 14",
      alt: "Pre-wedding photograph 14",
    },
    {
      id: "photo-15",
      src: "/assets/images/gallery/optimized/photo-15.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-15.webp",
      original: "/assets/images/gallery/original/photo-15.jpg",
      placeholderLabelKhmer: "រូបថត ១៥",
      placeholderLabelEnglish: "Photo 15",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ១៥",
      captionEnglish: "Pre-Wedding Memory 15",
      alt: "Pre-wedding photograph 15",
    },
    {
      id: "photo-16",
      src: "/assets/images/gallery/optimized/photo-16.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-16.webp",
      original: "/assets/images/gallery/original/photo-16.jpg",
      placeholderLabelKhmer: "រូបថត ១៦",
      placeholderLabelEnglish: "Photo 16",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ១៦",
      captionEnglish: "Pre-Wedding Memory 16",
      alt: "Pre-wedding photograph 16",
    },
    {
      id: "photo-17",
      src: "/assets/images/gallery/optimized/photo-17.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-17.webp",
      original: "/assets/images/gallery/original/photo-17.jpg",
      placeholderLabelKhmer: "រូបថត ១៧",
      placeholderLabelEnglish: "Photo 17",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ១៧",
      captionEnglish: "Pre-Wedding Memory 17",
      alt: "Pre-wedding photograph 17",
    },
    {
      id: "photo-18",
      src: "/assets/images/gallery/optimized/photo-18.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-18.webp",
      original: "/assets/images/gallery/original/photo-18.jpg",
      placeholderLabelKhmer: "រូបថត ១៨",
      placeholderLabelEnglish: "Photo 18",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ១៨",
      captionEnglish: "Pre-Wedding Memory 18",
      alt: "Pre-wedding photograph 18",
    },
    {
      id: "photo-19",
      src: "/assets/images/gallery/optimized/photo-19.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-19.webp",
      original: "/assets/images/gallery/original/photo-19.jpg",
      placeholderLabelKhmer: "រូបថត ១៩",
      placeholderLabelEnglish: "Photo 19",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ១៩",
      captionEnglish: "Pre-Wedding Memory 19",
      alt: "Pre-wedding photograph 19",
    },
    {
      id: "photo-20",
      src: "/assets/images/gallery/optimized/photo-20.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-20.webp",
      original: "/assets/images/gallery/original/photo-20.jpg",
      placeholderLabelKhmer: "រូបថត ២០",
      placeholderLabelEnglish: "Photo 20",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ២០",
      captionEnglish: "Pre-Wedding Memory 20",
      alt: "Pre-wedding photograph 20",
    },
    {
      id: "photo-21",
      src: "/assets/images/gallery/optimized/photo-21.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-21.webp",
      original: "/assets/images/gallery/original/photo-21.jpg",
      placeholderLabelKhmer: "រូបថត ២១",
      placeholderLabelEnglish: "Photo 21",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ២១",
      captionEnglish: "Pre-Wedding Memory 21",
      alt: "Pre-wedding photograph 21",
    },
    {
      id: "photo-22",
      src: "/assets/images/gallery/optimized/photo-22.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-22.webp",
      original: "/assets/images/gallery/original/photo-22.jpg",
      placeholderLabelKhmer: "រូបថត ២២",
      placeholderLabelEnglish: "Photo 22",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ២២",
      captionEnglish: "Pre-Wedding Memory 22",
      alt: "Pre-wedding photograph 22",
    },
    {
      id: "photo-23",
      src: "/assets/images/gallery/optimized/photo-23.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-23.webp",
      original: "/assets/images/gallery/original/photo-23.jpg",
      placeholderLabelKhmer: "រូបថត ២៣",
      placeholderLabelEnglish: "Photo 23",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ២៣",
      captionEnglish: "Pre-Wedding Memory 23",
      alt: "Pre-wedding photograph 23",
    },
    {
      id: "photo-24",
      src: "/assets/images/gallery/optimized/photo-24.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-24.webp",
      original: "/assets/images/gallery/original/photo-24.jpg",
      placeholderLabelKhmer: "រូបថត ២៤",
      placeholderLabelEnglish: "Photo 24",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ២៤",
      captionEnglish: "Pre-Wedding Memory 24",
      alt: "Pre-wedding photograph 24",
    },
    {
      id: "photo-25",
      src: "/assets/images/gallery/optimized/photo-25.webp",
      thumbnail: "/assets/images/gallery/thumbnails/photo-25.webp",
      original: "/assets/images/gallery/original/photo-25.jpg",
      placeholderLabelKhmer: "រូបថត ២៥",
      placeholderLabelEnglish: "Photo 25",
      captionKhmer: "អនុស្សាវរីយ៍ Pre-Wedding ២៥",
      captionEnglish: "Pre-Wedding Memory 25",
      alt: "Pre-wedding photograph 25",
    },
  ],

  // --- 6. WEDDING GIFT QR CODE (ចងដៃ) ---
  giftQR: {
    enabled: true,
    type: "image",
    imageSrc: "/assets/images/qr/sivminh_khqr.jpg",
    payload: "",
    accountName: "SIVMINH THA",
    accountNumber: "005 364 222",
    bankName: "ABA Bank",
    captionKhmer: "ចំណងដៃ និងជូនពរជ័យដល់គូស្វាមីភរិយាថ្មី",
    captionEnglish: "For wedding blessings and monetary gift",
  },

  // --- 7. INVITATION MESSAGES & GREETINGS ---
  message: {
    invitationTitleKhmer: "យើងខ្ញុំមានកិត្តិយសសូមគោរពអញ្ជើញ",
    invitationTitleEnglish: "Wedding Invitation",
    greetingKhmer:
      "ឯកឧត្តម លោកជំទាវ លោក លោកស្រី អ្នកនាងកញ្ញា ចូលរួមជាអធិបតី និងជាភ្ញៀវកិត្តិយស ដើម្បីប្រសិទ្ធពរជ័យ សិរីសួស្តី ក្នុងពិធីអាពាហ៍ពិពាហ៍កូនប្រុស-កូនស្រីរបស់យើងខ្ញុំ។",
    greetingEnglish:
      "We have the profound honor to welcome your esteemed presence and blessings at the wedding celebration of our son and daughter.",
    // Merged Gratitude & Apology (សេចក្តីថ្លែងអំណរគុណ និងសូមខន្តីអភ័យទោស)
    closingTitleKhmer: "សេចក្តីថ្លែងអំណរគុណ និងខន្តីអភ័យទោស",
    closingTitleEnglish: "GRATITUDE & SINCERE APOLOGY",
    closingCombinedKhmer:
      "វត្តមានដ៏ថ្លៃថ្លា និងពរជ័យដ៏ឧត្តុង្គឧត្តមរបស់អស់លោកអ្នក គឺជាកិត្តិយសដ៏ធំធេង និងជាសិរីសួស្តីសម្រាប់ក្រុមគ្រួសារយើងខ្ញុំទាំងពីរ។ ទន្ទឹមនឹងនេះ ប្រសិនបើមានការខ្វះខាត ឬភាពខុសឆ្គងដោយប្រការណាមួយក្នុងកំឡុងពេលរៀបចំពិធីមង្គលការ យើងខ្ញុំសូមការអធ្យាស្រ័យ និងខន្តីអភ័យទោសពីសំណាក់ភ្ញៀវកិត្តិយសទាំងអស់ដោយក្តីអនុគ្រោះ។ សូមអរគុណយ៉ាងជ្រាលជ្រៅ!",
    closingCombinedEnglish:
      "Your esteemed presence and heartfelt blessings bring immense joy and honor to both our families. At the same time, should there be any unintentional shortcomings or oversights during the wedding celebration, we humbly ask for your kind understanding and forgiveness. Thank you warmly!",
    // Individual fields (kept for flexibility)
    gratitudeKhmer:
      "វត្តមានដ៏ថ្លៃថ្លា និងពរជ័យដ៏ឧត្តុង្គឧត្តមរបស់អស់លោកអ្នក គឺជាកិត្តិយសដ៏ធំធេង និងជាសិរីសួស្តីសម្រាប់ក្រុមគ្រួសារយើងខ្ញុំទាំងពីរ។ សូមអរគុណយ៉ាងជ្រាលជ្រៅ!",
    gratitudeEnglish:
      "Your gracious presence and heartfelt blessings bring immense joy and honor to our families. Thank you warmly.",
    apologyKhmer:
      "ប្រសិនបើមានការខ្វះខាត ឬភាពខុសឆ្គងដោយប្រការណាមួយក្នុងកំឡុងពេលរៀបចំពិធីមង្គលការ យើងខ្ញុំសូមការអធ្យាស្រ័យ និងខន្តីអភ័យទោសពីសំណាក់ភ្ញៀវកិត្តិយសទាំងអស់ដោយក្តីអនុគ្រោះ។",
    apologyEnglish:
      "Should there be any unintentional shortcomings or oversights during the wedding celebration, we humbly ask for your kind understanding and forgiveness.",
    closingKhmer:
      "វត្តមានដ៏ថ្លៃថ្លារបស់អស់លោកអ្នក គឺជាកិត្តិយសដ៏ធំធេងសម្រាប់ក្រុមគ្រួសារយើងខ្ញុំ។ សូមអរគុណ!",
    closingEnglish:
      "Your gracious presence will bring great joy and honor to our families. Thank you warmly.",
  },

  // --- 8. AUDIO MEDIA ---
  media: {
    musicSrc: "/assets/audio/wedding_music.mp3",
    musicTitle: "Romdoul Kratie (Khmer Traditional Instrument)",
  },

  // --- 9. SOCIAL SHARING & METADATA ---
  sharing: {
    title: "Invitation Digital: Lay TongHour & Tha SivMinh",
    description:
      "You are cordially invited to the wedding celebration of Lay TongHour & Tha SivMinh on December 18, 2026.",
    url:
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://tonghoursivminh-invitation.vercel.app",
    ogImage: "/assets/images/gallery/original/photo-01.jpg",
  },

  // --- 10. CREATOR CREDIT ---
  credit: {
    label: "Invitation by",
    name: "Chea Soknai",
    tagline: "Make Invitation Comes Alive",
    socials: {
      facebook: "https://www.facebook.com/cheasoknai180506/",
      instagram: "https://www.instagram.com/nnnai_420",
      telegram: "https://t.me/CSoknai",
    },
  },
};

export default invitationData;
