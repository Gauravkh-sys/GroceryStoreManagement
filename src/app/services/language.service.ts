import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Product } from '../models/grocery.model';

export type AppLanguage = 'en' | 'hi';

const HINDI: Readonly<Record<string, string>> = {
  Shop: 'दुकान',
  Inventory: 'इन्वेंटरी',
  Categories: 'श्रेणियाँ',
  'Switch to Hindi': 'हिंदी में बदलें',
  'Switch to English': 'अंग्रेज़ी में बदलें',
  'Main navigation': 'मुख्य नेविगेशन',
  '© 2026, Gaurav Mishra — Durvijay General Store': '© 2026, गौरव मिश्रा — Durvijay General Store',
  'Switch to light mode': 'लाइट मोड में बदलें',
  'Switch to dark mode': 'डार्क मोड में बदलें',
  'Open shopping cart': 'खरीदारी की टोकरी खोलें',
  'Close shopping cart': 'खरीदारी की टोकरी बंद करें',
  'Close cart': 'टोकरी बंद करें',
  'Durvijay General Store home': 'Durvijay General Store होम',
  'good food, good mood': 'अच्छा खाना, अच्छा मूड',
  'Manage store': 'स्टोर प्रबंधित करें',
  'Store profile': 'स्टोर प्रोफ़ाइल',
  'Welcome to Durvijay General Store': 'Durvijay General Store में आपका स्वागत है',
  'Sign in to your account': 'अपने खाते में साइन इन करें',
  'Choose how you want to continue': 'चुनें कि आप कैसे आगे बढ़ना चाहते हैं',
  'Store manager': 'स्टोर प्रबंधक',
  Customer: 'ग्राहक',
  'Manager access': 'प्रबंधक लॉगिन',
  'Customer access': 'ग्राहक लॉगिन',
  'Email address': 'ईमेल पता',
  'Email or phone number': 'ईमेल या फ़ोन नंबर',
  Password: 'पासवर्ड',
  'Enter your email address': 'अपना ईमेल पता दर्ज करें',
  'Enter your email or phone number': 'अपना ईमेल या फ़ोन नंबर दर्ज करें',
  'Enter your password': 'अपना पासवर्ड दर्ज करें',
  'Sign in': 'साइन इन करें',
  'Browse the store without signing in': 'साइन इन किए बिना स्टोर देखें',
  'No registration is available yet.': 'अभी पंजीकरण उपलब्ध नहीं है।',
  'Sign-in is not connected yet. No account was created or signed in.': 'साइन-इन अभी कनेक्ट नहीं है। कोई खाता नहीं बनाया गया और न ही साइन इन किया गया।',
  'Authentication is not configured yet. Sign-in will be enabled once a secure service is connected.': 'अभी प्रमाणीकरण कॉन्फ़िगर नहीं है। सुरक्षित सेवा कनेक्ट होने पर साइन-इन सक्षम होगा।',
  'Fresh groceries, a little closer to home.': 'ताज़ा किराना, आपके घर के और करीब।',
  'Good food, good mood': 'अच्छा खाना, अच्छा मूड',
  'A smoother way to shop and manage your store.': 'खरीदारी और स्टोर प्रबंधन का आसान तरीका।',
  'Your neighbourhood market, thoughtfully stocked.': 'आपका पड़ोस का बाज़ार, सोच-समझकर सजाया गया।',
  'Fresh picks, friendly service, every day.': 'ताज़ा पसंद, अपनापन भरी सेवा, हर दिन।',
  'Explore the market': 'बाज़ार देखें',
  'Login options': 'लॉगिन विकल्प',
  'Sign in form': 'साइन-इन फ़ॉर्म',
  'Password must be at least 8 characters.': 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।',
  'This field is required.': 'यह फ़ील्ड आवश्यक है।',
  'Enter a valid email address.': 'एक मान्य ईमेल पता दर्ज करें।',
  'Fresh from the farm': 'खेत से ताज़ा',
  'A little more': 'हर दिन थोड़ा और',
  fresh : 'ताज़गी',
  'in every day.': 'हर दिन।',
  'Good-for-you groceries, picked with care and ready for your table.': 'आपके लिए अच्छे किराने के सामान, सावधानी से चुने गए और आपकी मेज़ के लिए तैयार।',
  'Locally sourced': 'स्थानीय उत्पाद',
  'Always fresh': 'हमेशा ताज़ा',
  'The good stuff': 'बेहतरीन चीज़ें',
  'Shop our market': 'हमारे बाज़ार से खरीदें',
  'A few fresh favorites for your week.': 'आपके सप्ताह के लिए कुछ ताज़ा पसंदीदा चीज़ें।',
  'Search products by name': 'नाम से उत्पाद खोजें',
  'Find something fresh...': 'कुछ ताज़ा खोजें...',
  'Filter products by category': 'श्रेणी के अनुसार उत्पाद छाँटें',
  All: 'सभी',
  'Nothing on the shelf': 'शेल्फ़ पर कुछ नहीं मिला',
  'Try a different search or category.': 'कोई दूसरा शब्द या श्रेणी खोजें।',
  'Clear filters': 'फ़िल्टर हटाएँ',
  'On the shelves': 'शेल्फ़ पर उपलब्ध',
  items: 'वस्तुएँ',
  'Fresh picks': 'ताज़ा पसंद',
  'Every day': 'हर दिन',
  'Happy shoppers': 'खुश ग्राहक',
  'Made for good days.': 'अच्छे दिनों के लिए बनाया गया।',
  'Fresh choices, right around the corner': 'ताज़ा विकल्प, आपके पास ही',
  'Your basket': 'आपकी टोकरी',
  'A fresh little haul': 'आपकी ताज़ा खरीदारी',
  Subtotal: 'उप-योग',
  Tax: 'कर',
  Total: 'कुल',
  'Order via WhatsApp': 'WhatsApp से ऑर्डर करें',
  'Review and send this order to the store on WhatsApp': 'WhatsApp पर ऑर्डर देखें और स्टोर को भेजें',
  'WhatsApp will open with your message ready. Review and send it there; your basket stays here until the store confirms your order.': 'WhatsApp में आपका संदेश तैयार खुलेगा। उसे देखकर भेजें। स्टोर द्वारा ऑर्डर की पुष्टि तक आपकी टोकरी यहीं रहेगी।',
  'Your basket is taking a nap': 'आपकी टोकरी अभी खाली है',
  'Pop in a few fresh favorites and they’ll show up here.': 'कुछ ताज़ा पसंदीदा चीज़ें जोड़ें, वे यहाँ दिखाई देंगी।',
  'Keep browsing': 'खरीदारी जारी रखें',
  'Remove {name} from cart': '{name} को टोकरी से हटाएँ',
  'Remove {name}': '{name} हटाएँ',
  'Decrease {name} quantity': '{name} की मात्रा घटाएँ',
  'Increase {name} quantity': '{name} की मात्रा बढ़ाएँ',
  'Add {name} to cart': '{name} टोकरी में जोड़ें',
  'Rename {name}': '{name} का नाम बदलें',
  'Archive {name}': '{name} संग्रहित करें',
  'Restore {name}': '{name} बहाल करें',
  'Select {name} icon': '{name} आइकन चुनें',
  Add: 'जोड़ें',
  'Out of stock': 'स्टॉक में नहीं',
  'Low stock': 'कम स्टॉक',
  'In stock': 'स्टॉक उपलब्ध',
  left: 'बाकी',
  per: 'प्रति',
  'Durvijay General Store': 'दुर्विजय जनरल स्टोर',
  // 'Store manager': 'स्टोर प्रबंधक',
  'Keep your shelves fresh and up to date.': 'अपनी शेल्फ़ को ताज़ा और अपडेट रखें।',
  Products: 'उत्पाद',
  'Running low': 'कम स्टॉक',
  'Product stock': 'उत्पाद स्टॉक',
  'Changes are saved in this session.': 'बदलाव इस सेशन में सहेजे जाते हैं।',
  'Live inventory': 'लाइव इन्वेंटरी',
  Product: 'उत्पाद',
  Category: 'श्रेणी',
  Price: 'कीमत',
  'On hand': 'उपलब्ध मात्रा',
  Action: 'कार्रवाई',
  Remove: 'हटाएँ',
  'No products in inventory yet.': 'अभी इन्वेंटरी में कोई उत्पाद नहीं है।',
  'Add a product': 'उत्पाद जोड़ें',
  'Fill in the product details.': 'उत्पाद का विवरण भरें।',
  'Product name': 'उत्पाद का नाम',
  'e.g. Crisp red apples': 'जैसे: ताज़े लाल सेब',
  'Enter a name with no more than 60 characters.': '60 अक्षरों तक का नाम दर्ज करें।',
  'Select a category': 'श्रेणी चुनें',
  'Add or restore a category in Category Master before adding products.': 'उत्पाद जोड़ने से पहले श्रेणी प्रबंधक में श्रेणी जोड़ें या बहाल करें।',
  'That category is no longer active. Choose an active category.': 'यह श्रेणी अब सक्रिय नहीं है। कोई सक्रिय श्रेणी चुनें।',
  'Price (₹)': 'कीमत (₹)',
  Stock: 'स्टॉक',
  'Enter a valid price and stock quantity.': 'सही कीमत और स्टॉक मात्रा दर्ज करें।',
  'Product icon': 'उत्पाद आइकन',
  Selected: 'चयनित',
  'Search icons: rice, detergent, battery...': 'आइकन खोजें: चावल, डिटर्जेंट, बैटरी...',
  'Search product icons': 'उत्पाद आइकन खोजें',
  'Or enter a custom emoji': 'या अपना इमोजी दर्ज करें',
  'No icons found. You can still enter a custom emoji below.': 'कोई आइकन नहीं मिला। नीचे अपना इमोजी दर्ज करें।',
  'Sold as': 'इकाई',
  'e.g. bag': 'जैसे: थैला',
  'Add to inventory': 'इन्वेंटरी में जोड़ें',
  'Category master': 'श्रेणी प्रबंधक',
  'Organize the categories used across your market.': 'अपने बाज़ार की श्रेणियों को व्यवस्थित करें।',
  'Active categories': 'सक्रिय श्रेणियाँ',
  'Available in shop filters and product forms.': 'दुकान फ़िल्टर और उत्पाद फ़ॉर्म में उपलब्ध।',
  Visible: 'दिखाई दे रही हैं',
  'Archived categories': 'संग्रहीत श्रेणियाँ',
  'Hidden from shop filters and product forms. Restore them any time.': 'दुकान फ़िल्टर और उत्पाद फ़ॉर्म से छिपी हुई। कभी भी बहाल करें।',
  Rename: 'नाम बदलें',
  Archive: 'संग्रहित करें',
  Save: 'सहेजें',
  Cancel: 'रद्द करें',
  Restore: 'बहाल करें',
  'No active categories. Add or restore a category to use it in the store.': 'कोई सक्रिय श्रेणी नहीं। स्टोर में उपयोग के लिए श्रेणी जोड़ें या बहाल करें।',
  'No archived categories.': 'कोई संग्रहीत श्रेणी नहीं।',
  'Add a category': 'श्रेणी जोड़ें',
  'Create a category for new products.': 'नए उत्पादों के लिए श्रेणी बनाएँ।',
  'Category name': 'श्रेणी का नाम',
  'e.g. Frozen Foods': 'जैसे: जमे हुए खाद्य पदार्थ',
  'Enter a name with no more than 40 characters.': '40 अक्षरों तक का नाम दर्ज करें।',
  'Add category': 'श्रेणी जोड़ें',
  'Archiving hides a category from shoppers and product forms. Existing products stay visible, but shoppers cannot add them to their basket until you restore the category.': 'श्रेणी संग्रहित करने पर यह ग्राहकों और उत्पाद फ़ॉर्म से छिप जाती है। मौजूदा उत्पाद दिखते रहेंगे, लेकिन श्रेणी बहाल होने तक ग्राहक उन्हें टोकरी में नहीं जोड़ पाएँगे।',
  'Category added.': 'श्रेणी जोड़ दी गई।',
  'Category renamed.': 'श्रेणी का नाम बदल दिया गया।',
  'Category archived. Existing products remain visible but cannot be added to the basket.': 'श्रेणी संग्रहित की गई। मौजूदा उत्पाद दिखेंगे, लेकिन टोकरी में नहीं जोड़े जा सकते।',
  'Category restored.': 'श्रेणी बहाल की गई।',
  'Enter a category name with 1 to 40 characters.': '1 से 40 अक्षरों का श्रेणी नाम दर्ज करें।',
  'A category with that name already exists.': 'इस नाम की श्रेणी पहले से मौजूद है।',
  'That category no longer exists. Refresh and try again.': 'यह श्रेणी अब मौजूद नहीं है। रीफ़्रेश करके फिर कोशिश करें।',
  'That category is already archived.': 'यह श्रेणी पहले से संग्रहित है।',
  'That category is already active.': 'यह श्रेणी पहले से सक्रिय है।',
  'Unable to add that product right now.': 'अभी यह उत्पाद नहीं जोड़ा जा सका।',
  'Added to your basket': 'आपकी टोकरी में जोड़ दिया गया',
  'Sorry, this item is out of stock': 'क्षमा करें, यह उत्पाद स्टॉक में नहीं है',
  'That quantity is not available in stock': 'यह मात्रा स्टॉक में उपलब्ध नहीं है',
  'This product’s category is archived.': 'इस उत्पाद की श्रेणी संग्रहित है।',
  'Archived category': 'संग्रहित श्रेणी',
  'products': 'उत्पाद',
  'products still visible in the shop': 'उत्पाद अभी भी दुकान में दिख रहे हैं',
  'Hello Durvijay General store ! I would like to place this order:': 'नमस्ते दुर्विजय दुकान! मैं यह ऑर्डर देना चाहता/चाहती हूँ:',
  'Please confirm availability and delivery or pickup details. Thank you!': 'कृपया उपलब्धता और डिलीवरी या पिकअप की जानकारी की पुष्टि करें। धन्यवाद!',
  'Subtotal:': 'उप-योग:',
  'Tax (8%):': 'कर (8%):',
  'Total:': 'कुल:',
  'Fresh Organic Bananas': 'ताज़े ऑर्गेनिक केले',
  'Whole Milk 1L': 'फुल क्रीम दूध 1 लीटर',
  'Whole Wheat Bread': 'साबुत गेहूँ की ब्रेड',
  'Hass Avocados': 'हास एवोकाडो',
  'Greek Yogurt': 'ग्रीक योगर्ट',
  'Orange Juice 1L': 'संतरे का जूस 1 लीटर',
  'Free-Range Eggs 12pk': 'फ्री-रेंज अंडे, 12 का पैक',
  'Organic Spinach': 'ऑर्गेनिक पालक',
  'Ground Coffee': 'पिसी हुई कॉफ़ी',
  'Plant-Based Dish Soap': 'प्लांट-बेस्ड बर्तन धोने का साबुन',
  Bread: 'ब्रेड',
  'Fruits & Vegetables': 'फल और सब्ज़ियाँ',
  'Dairy & Eggs': 'डेयरी और अंडे',
  'Bakery & Snacks': 'बेकरी और स्नैक्स',
  Beverages: 'पेय पदार्थ',
  'Household Essentials': 'घरेलू ज़रूरतें',
  bunch: 'गुच्छा',
  bottle: 'बोतल',
  loaf: 'लोफ',
  tub: 'टब',
  carton: 'कार्टन',
  bag: 'थैला',
  'pack of 3': '3 का पैक',
  item: 'वस्तु',
  'Fruits & vegetables': 'फल और सब्ज़ियाँ',
  'Grains, pulses & pantry': 'अनाज, दालें और रसोई का सामान',
  'Dairy, eggs & meat': 'डेयरी, अंडे और मांस',
  'Snacks & sweets': 'स्नैक्स और मिठाइयाँ',
  Drinks: 'पेय पदार्थ',
  'Household & cleaning': 'घर और सफ़ाई',
  'Personal care & health': 'व्यक्तिगत देखभाल और स्वास्थ्य',
  'Pet & farm supplies': 'पालतू पशु और खेती का सामान',
  'Other essentials': 'अन्य ज़रूरी सामान',
  Apple: 'सेब',
  'Green apple': 'हरा सेब',
  Banana: 'केला',
  Orange: 'संतरा',
  Lemon: 'नींबू',
  Pear: 'नाशपाती',
  Peach: 'आड़ू',
  Grapes: 'अंगूर',
  Watermelon: 'तरबूज़',
  Strawberry: 'स्ट्रॉबेरी',
  Blueberries: 'ब्लूबेरी',
  Cherries: 'चेरी',
  Pineapple: 'अनानास',
  Mango: 'आम',
  Avocado: 'एवोकाडो',
  Tomato: 'टमाटर',
  Carrot: 'गाजर',
  Corn: 'मक्का',
  Broccoli: 'ब्रोकोली',
  'Leafy greens': 'पत्तेदार सब्ज़ियाँ',
  Cucumber: 'खीरा',
  'Bell pepper': 'शिमला मिर्च',
  Mushroom: 'मशरूम',
  Potato: 'आलू',
  Onion: 'प्याज़',
  Garlic: 'लहसुन',
  Peanuts: 'मूँगफली',
  Coconut: 'नारियल',
  Olives: 'जैतून',
  Herbs: 'जड़ी-बूटियाँ',
  Wheat: 'गेहूँ',
  Rice: 'चावल',
  'Rice sack': 'चावल की बोरी',
  'Bread flour': 'ब्रेड का आटा',
  'Flatbread': 'रोटी',
  Croissant: 'क्रोइसैन',
  Bagel: 'बैगल',
  Pretzel: 'प्रेट्ज़ेल',
  Pancakes: 'पैनकेक',
  Waffles: 'वॉफल',
  Cereal: 'सीरियल',
  Oats: 'ओट्स',
  Beans: 'फलियाँ',
  Lentils: 'दाल',
  Noodles: 'नूडल्स',
  Pasta: 'पास्ता',
  Spaghetti: 'स्पेगेटी',
  Salt: 'नमक',
  Honey: 'शहद',
  'Peanut butter': 'पीनट बटर',
  'Cooking oil': 'खाना पकाने का तेल',
  Spices: 'मसाले',
  Sauce: 'सॉस',
  Milk: 'दूध',
  Cheese: 'चीज़',
  Butter: 'मक्खन',
  Eggs: 'अंडे',
  Yogurt: 'दही',
  'Ice cream': 'आइसक्रीम',
  Chicken: 'चिकन',
  Meat: 'मांस',
  Bacon: 'बेकन',
  Fish: 'मछली',
  Shrimp: 'झींगा',
  Sausage: 'सॉसेज',
  Biscuits: 'बिस्कुट',
  Cookies: 'कुकीज़',
  Crackers: 'क्रैकर्स',
  Chips: 'चिप्स',
  Popcorn: 'पॉपकॉर्न',
  Chocolate: 'चॉकलेट',
  Candy: 'टॉफ़ी',
  Lollipop: 'लॉलीपॉप',
  Cake: 'केक',
  Cupcake: 'कपकेक',
  Doughnut: 'डोनट',
  Pie: 'पाई',
  'Snack packet': 'स्नैक पैकेट',
  Water: 'पानी',
  'Bottled water': 'बोतलबंद पानी',
  Tea: 'चाय',
  Coffee: 'कॉफ़ी',
  Juice: 'जूस',
  'Orange juice': 'संतरे का जूस',
  'Soft drink': 'सॉफ्ट ड्रिंक',
  Milkshake: 'मिल्कशेक',
  'Coconut water': 'नारियल पानी',
  'Drink carton': 'पेय का कार्टन',
  'Drink bottle': 'पेय की बोतल',
  'Sports drink': 'स्पोर्ट्स ड्रिंक',
  'Detergent powder or Surf detergent': 'डिटर्जेंट पाउडर या सर्फ़',
  'Laundry detergent liquid': 'लिक्विड लॉन्ड्री डिटर्जेंट',
  'Soap bar': 'साबुन की टिकिया',
  'Dishwashing bar or Vim bar': 'बर्तन धोने की टिकिया या विम बार',
  'Dishwash liquid': 'बर्तन धोने का लिक्विड',
  Sponge: 'स्पंज',
  'Cleaning spray': 'क्लीनिंग स्प्रे',
  Bleach: 'ब्लीच',
  Broom: 'झाड़ू',
  Bucket: 'बाल्टी',
  'Toilet paper': 'टॉयलेट पेपर',
  Tissue: 'टिश्यू',
  'Trash bag': 'कचरे का बैग',
  'Light bulb': 'बल्ब',
  'Electric cell or battery': 'इलेक्ट्रिक सेल या बैटरी',
  'Laundry basket': 'कपड़ों की टोकरी',
  Clothespin: 'कपड़े की क्लिप',
  'Home supplies': 'घरेलू सामान',
  'Food container': 'खाने का डिब्बा',
  'Kitchen utensils': 'रसोई के बर्तन',
  Toothbrush: 'टूथब्रश',
  Toothpaste: 'टूथपेस्ट',
  Shampoo: 'शैम्पू',
  Conditioner: 'कंडीशनर',
  'Body wash': 'बॉडी वॉश',
  Deodorant: 'डिओडोरेंट',
  Comb: 'कंघी',
  Razor: 'रेज़र',
  'Face care': 'चेहरे की देखभाल',
  Cotton: 'रूई',
  'First aid': 'प्राथमिक उपचार',
  Medicine: 'दवा',
  Thermometer: 'थर्मामीटर',
  'Face mask': 'मास्क',
  Sunscreen: 'सनस्क्रीन',
  Diapers: 'डायपर',
  'Cow feed': 'गाय का चारा',
  'Animal feed or fodder': 'पशु आहार या चारा',
  'Pet food': 'पालतू पशुओं का भोजन',
  'Dog food': 'कुत्ते का भोजन',
  'Cat food': 'बिल्ली का भोजन',
  'Chicken feed': 'मुर्गियों का दाना',
  'Pet treats': 'पालतू पशुओं के ट्रीट',
  'Animal care': 'पशु देखभाल',
  Seeds: 'बीज',
  'Plant food': 'पौधों का खाद',
  'Garden supplies': 'बागवानी का सामान',
  'Shopping bag': 'खरीदारी का बैग',
  'Shopping basket': 'खरीदारी की टोकरी',
  Cart: 'कार्ट',
  Gift: 'उपहार',
  Package: 'पैकेज',
  Stationery: 'स्टेशनरी',
  Notebook: 'नोटबुक',
  Paper: 'कागज़',
  Umbrella: 'छाता',
  Tools: 'औज़ार',
  Miscellaneous: 'विविध',
};

const PRODUCT_NAMES: Readonly<Record<string, string>> = {
  bananas: 'Fresh Organic Bananas',
  milk: 'Whole Milk 1L',
  bread: 'Whole Wheat Bread',
  avocados: 'Hass Avocados',
  yogurt: 'Greek Yogurt',
  juice: 'Orange Juice 1L',
  eggs: 'Free-Range Eggs 12pk',
  spinach: 'Organic Spinach',
  coffee: 'Ground Coffee',
  'dish-soap': 'Plant-Based Dish Soap',
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly current = signal<AppLanguage>('en');
  readonly locale = computed(() =>
    this.current() === 'hi' ? 'hi-IN' : 'en-IN',
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.setLanguage(this.readSavedLanguage());
    } else {
      this.document.documentElement.lang = 'en';
    }
  }

  toggle(): void {
    this.setLanguage(this.current() === 'en' ? 'hi' : 'en');
  }

  text(key: string, values?: Readonly<Record<string, string | number>>): string {
    let result = this.current() === 'hi' ? (HINDI[key] ?? key) : key;
    for (const [name, value] of Object.entries(values ?? {})) {
      result = result.replaceAll(`{${name}}`, String(value));
    }
    return result;
  }

  category(name: string): string {
    return this.text(name);
  }

  product(product: Product): string {
    const builtInName = PRODUCT_NAMES[product.id];
    return builtInName ? this.text(builtInName) : product.name;
  }

  unit(unit: string): string {
    return this.text(unit);
  }

  productCount(count: number): string {
    return this.current() === 'hi'
      ? `${count} उत्पाद`
      : `${count} ${count === 1 ? 'product' : 'products'}`;
  }

  productsVisibleCount(count: number): string {
    return this.current() === 'hi'
      ? `${count} उत्पाद अभी भी दुकान में दिख रहे हैं`
      : `${count} ${count === 1 ? 'product' : 'products'} still visible in the shop`;
  }

  private setLanguage(language: AppLanguage): void {
    this.current.set(language);
    this.document.documentElement.lang = language;

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      this.document.defaultView?.localStorage.setItem(
        'freshly-language',
        language,
      );
    } catch (error) {
      console.warn('Unable to save the language preference.', error);
    }
  }

  private readSavedLanguage(): AppLanguage {
    try {
      return this.document.defaultView?.localStorage.getItem(
        'freshly-language',
      ) === 'hi'
        ? 'hi'
        : 'en';
    } catch (error) {
      console.warn('Unable to read the saved language preference.', error);
      return 'en';
    }
  }
}
