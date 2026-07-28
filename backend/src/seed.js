'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./features/auth/user.model');
const Story = require('./features/stories/story.model');
const Proverb = require('./features/proverbs/proverb.model');
const Chat = require('./features/chat/chat.model');
const Bookmark = require('./features/bookmarks/bookmark.model');
const Upload = require('./features/uploads/upload.model');
const KnowledgeNode = require('./features/graph/graph.node.model');
const KnowledgeEdge = require('./features/graph/graph.edge.model');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear all collections
  await Promise.all([
    User.deleteMany({}),
    Story.deleteMany({}),
    Proverb.deleteMany({}),
    Chat.deleteMany({}),
    Bookmark.deleteMany({}),
    Upload.deleteMany({}),
    KnowledgeNode.deleteMany({}),
    KnowledgeEdge.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // ── USERS ──────────────────────────────────────────────────────────────────
  const password = await bcrypt.hash('Password123!', 12);

  const [admin, contributor, judge] = await User.insertMany([
    {
      name: 'Admin User',
      email: 'admin@memoryai.ng',
      password,
      role: 'admin',
      isEmailVerified: true,
      preferredLanguage: 'english',
      bio: 'Platform administrator and indigenous knowledge curator.',
      interests: ['history', 'folktales', 'proverbs', 'culture'],
    },
    {
      name: 'Amina Bello',
      email: 'amina@memoryai.ng',
      password,
      role: 'contributor',
      isEmailVerified: true,
      preferredLanguage: 'hausa',
      bio: 'Hausa oral historian from Kano. Preserving northern Nigerian traditions.',
      interests: ['history', 'folktales', 'proverbs'],
    },
    {
      name: 'Judge Demo',
      email: 'judge@memoryai.ng',
      password,
      role: 'user',
      isEmailVerified: true,
      preferredLanguage: 'english',
      bio: 'Hackathon judge account — full access to all demo content.',
      interests: ['history', 'folktales', 'proverbs', 'culture', 'education', 'music'],
    },
  ]);
  console.log('Users created');

  // ── STORIES ────────────────────────────────────────────────────────────────
  const stories = await Story.insertMany([
    {
      title: 'Ijapa ati Ẹyẹ — The Tortoise and the Birds',
      content: `Long ago, when animals could speak and the sky held feasts, Ijapa the tortoise heard that the birds were invited to a great celebration in the heavens. Ijapa, always cunning, begged each bird for a single feather until he had enough to fashion wings for himself.\n\nBefore they departed, Ijapa announced: "In the land above, we must each take a new name. My name shall be 'All of You'." The birds, amused, agreed.\n\nWhen the feast was laid out and the sky people asked who the food was for, the host replied: "It is for all of you." Ijapa stepped forward and ate everything, for his name was All of You.\n\nThe birds, furious and hungry, each took back their feather before the descent. Ijapa, featherless, sent a message to his wife through a passing bird — but the bird, still angry, told her to bring out all the hard things in the house. When Ijapa fell from the sky, he landed on iron pots and grinding stones, shattering his shell into a hundred pieces.\n\nThe medicine man pieced him back together, which is why the tortoise shell has many lines to this day.`,
      language: 'yoruba',
      knowledgeType: 'folktale',
      contributor: contributor._id,
      isPublished: true,
      isFeatured: true,
      tags: ['tortoise', 'birds', 'trickster', 'sky', 'yoruba', 'ijapa'],
      analysis: {
        status: 'completed',
        summary: 'A classic Yoruba trickster tale about Ijapa the tortoise who deceives birds to attend a sky feast, eats all the food under the name "All of You", and suffers the consequences when the birds reclaim their feathers, causing him to fall and shatter his shell.',
        moralLesson: 'Greed and deception ultimately lead to one\'s own downfall. Cleverness without integrity brings suffering.',
        culturalContext: 'Ijapa (tortoise) is the archetypal trickster figure in Yoruba oral tradition, equivalent to Anansi in West African diaspora stories. These tales were told at night around fires to teach children moral values through entertainment.',
        themes: ['trickery', 'greed', 'consequences', 'community', 'cleverness'],
        historicalPeriod: 'Pre-colonial Yorubaland',
        geographicOrigin: 'Southwest Nigeria',
        characters: [
          { name: 'Ijapa', role: 'Protagonist/Trickster', significance: 'Represents cunning without wisdom; his shell pattern is the origin story element' },
          { name: 'The Birds', role: 'Antagonists/Victims', significance: 'Represent the community that Ijapa exploits and who ultimately deliver justice' },
        ],
        difficultTerms: [
          { term: 'Ijapa', meaning: 'Tortoise in Yoruba; the classic trickster character', language: 'yoruba' },
          { term: 'Ẹyẹ', meaning: 'Bird(s) in Yoruba', language: 'yoruba' },
        ],
        educationalValue: 'Teaches ethics, consequences of deception, and the importance of community trust. Suitable for primary school moral education.',
        analyzedAt: new Date(),
      },
    },
    {
      title: 'Sungbo\'s Eredo — The Great Earthwork of the Yoruba Queen',
      content: `In the forests south of Ijebu-Ode lies one of Africa's greatest ancient monuments — a vast system of earthen walls and ditches stretching over 160 kilometres, enclosing an area larger than the ancient city of Benin.\n\nThe people say it was built by Bilikisu Sungbo, a powerful and wealthy Yoruba queen who lived over a thousand years ago. Some say she was the biblical Queen of Sheba herself, who came to Nigeria after her famous visit to King Solomon.\n\nSungbo had no children, and so she commissioned this great work as her legacy — so that the world would remember her long after she was gone. Thousands of workers dug the trenches and piled the earth for years. The walls rose as high as seven metres in places, the ditches as deep as four.\n\nThe Ijebu people still make pilgrimages to her shrine near Oke-Eiri. They bring offerings of cloth, kola nuts, and palm wine. They pray to her spirit for fertility, prosperity, and protection.\n\nModern archaeologists have dated the earthwork to around 1000 CE, making it one of the largest single ancient construction projects in sub-Saharan Africa — yet it remains largely unknown to the outside world.`,
      language: 'yoruba',
      knowledgeType: 'oral_history',
      contributor: admin._id,
      isPublished: true,
      isFeatured: true,
      tags: ['sungbo', 'eredo', 'ijebu', 'queen', 'earthwork', 'archaeology', 'yoruba'],
      analysis: {
        status: 'completed',
        summary: 'The oral history of Bilikisu Sungbo, a powerful Yoruba queen who built the Sungbo\'s Eredo — a 160km earthwork system near Ijebu-Ode — as her legacy. The site, dated to ~1000 CE, is one of sub-Saharan Africa\'s largest ancient constructions and remains a living pilgrimage site.',
        moralLesson: 'A great legacy is built through service to community and the desire to be remembered for good works, not personal gain.',
        culturalContext: 'Sungbo\'s Eredo is a real archaeological site. The oral tradition connecting it to a female ruler reflects the historical importance of women in Yoruba political life. The shrine remains active, blending indigenous religion with later Islamic and Christian influences.',
        themes: ['legacy', 'female leadership', 'ancient engineering', 'pilgrimage', 'memory'],
        historicalPeriod: 'circa 1000 CE, Ijebu Kingdom',
        geographicOrigin: 'Ijebu-Ode, Ogun State, Southwest Nigeria',
        characters: [
          { name: 'Bilikisu Sungbo', role: 'Historical Queen', significance: 'Represents female power and the drive to create lasting legacy in pre-colonial Yoruba society' },
        ],
        difficultTerms: [
          { term: 'Eredo', meaning: 'Earthwork/ditch fortification in Yoruba', language: 'yoruba' },
          { term: 'Kola nut', meaning: 'Sacred nut used in Yoruba ceremonies and offerings; symbolises hospitality and spiritual connection', language: 'yoruba' },
        ],
        educationalValue: 'Connects oral tradition with verifiable archaeology. Excellent for history, gender studies, and African civilisation curricula.',
        analyzedAt: new Date(),
      },
    },
    {
      title: 'Malam Isa da Kura — The Scholar and the Hyena',
      content: `A long time ago in the ancient city of Kano, there lived a learned Islamic scholar named Malam Isa who was known for his wisdom and his pride. He had memorised the entire Quran and could recite hadith from memory, yet he looked down on those less educated than himself.\n\nOne evening, walking home from the mosque, Malam Isa encountered a hyena sitting calmly in the road. In Hausa belief, the hyena is associated with witches and the spirit world — to meet one at night is a serious omen.\n\n"Move aside, beast," said Malam Isa. "Do you not know who I am?"\n\nThe hyena spoke: "I know exactly who you are, Malam. You are a man who has filled his head with knowledge but emptied his heart of humility. Your books have made you blind."\n\nMalam Isa was so shocked that an animal spoke that he fell to his knees. When he looked up, the hyena was gone. In its place sat an old beggar woman he had passed every day without acknowledgement.\n\nFrom that day, Malam Isa greeted every person he met, learned or unlearned, rich or poor. He became known not just as the most knowledgeable man in Kano, but as the wisest.`,
      language: 'hausa',
      knowledgeType: 'folktale',
      contributor: contributor._id,
      isPublished: true,
      isFeatured: false,
      tags: ['hyena', 'scholar', 'kano', 'humility', 'hausa', 'islamic', 'wisdom'],
      analysis: {
        status: 'completed',
        summary: 'A Hausa folktale set in Kano about a proud Islamic scholar who is humbled by a speaking hyena — revealed to be a disguised beggar woman — and learns that true wisdom requires humility, not just knowledge.',
        moralLesson: 'Knowledge without humility is worthless. True wisdom is shown through how we treat others, especially those society considers beneath us.',
        culturalContext: 'This tale blends Hausa indigenous belief (the hyena as a spirit-world messenger) with Islamic values of humility (tawadu). Such syncretic stories are common in northern Nigeria where Islam has been practised for over 700 years alongside older Hausa spiritual traditions.',
        themes: ['humility', 'knowledge vs wisdom', 'spiritual warning', 'social equality', 'transformation'],
        historicalPeriod: 'Kano Emirate period, 18th–19th century',
        geographicOrigin: 'Kano, Northern Nigeria',
        characters: [
          { name: 'Malam Isa', role: 'Protagonist', significance: 'Represents the danger of intellectual pride; his transformation is the moral core' },
          { name: 'The Hyena/Beggar Woman', role: 'Supernatural messenger', significance: 'In Hausa tradition, hyenas can be vehicles for spirits; the disguise reveals the scholar\'s blindness to human dignity' },
        ],
        difficultTerms: [
          { term: 'Malam', meaning: 'Islamic scholar or learned man in Hausa; a title of respect', language: 'hausa' },
          { term: 'Kura', meaning: 'Hyena in Hausa; associated with witchcraft and the spirit world', language: 'hausa' },
          { term: 'Hadith', meaning: 'Recorded sayings and actions of the Prophet Muhammad', language: 'arabic' },
        ],
        educationalValue: 'Excellent for teaching the intersection of religion and indigenous belief, and for discussions on social class and respect.',
        analyzedAt: new Date(),
      },
    },
    {
      title: 'Ogbanje — The Spirit Child Who Returns',
      content: `Among the Igbo people, there exists a class of spirit beings called Ogbanje — children who are born, die young, and are reborn to the same mother, over and over, in a cycle of grief.\n\nThey are not evil. They are spirits who have not yet decided to stay in the world of the living. They keep one foot in the spirit world (Ani Mmo) and one in the human world. They are often the most beautiful children, the most gifted — and the most fragile.\n\nWhen a child dies repeatedly in a family, the dibia (traditional doctor) is called. Through divination, he seeks the iyi-uwa — the stone or object that binds the Ogbanje to the spirit world. If found and destroyed, the child's spirit agrees to stay.\n\nThe iyi-uwa might be buried under a tree, hidden in a stream, or concealed in the compound. Once destroyed in a ceremony with the child present, the cycle is broken.\n\nChinua Achebe immortalised the Ogbanje in "Things Fall Apart" through the character of Ezinma. But long before Achebe, every Igbo grandmother knew the signs: a child born with unusual markings, who smiled too knowingly, who seemed to look at things others could not see.\n\nModern medicine calls it infant mortality. The Igbo called it Ogbanje — and built an entire spiritual framework to understand, grieve, and heal from it.`,
      language: 'igbo',
      knowledgeType: 'tradition',
      contributor: admin._id,
      isPublished: true,
      isFeatured: true,
      tags: ['ogbanje', 'spirit child', 'igbo', 'dibia', 'iyi-uwa', 'reincarnation', 'tradition'],
      analysis: {
        status: 'completed',
        summary: 'An explanation of the Igbo spiritual concept of Ogbanje — spirit children who cycle between the living and spirit worlds, causing repeated infant deaths. The tradition includes diagnosis by a dibia and a healing ceremony to destroy the iyi-uwa (spirit-world binding object) and end the cycle.',
        moralLesson: 'Every culture develops frameworks to understand suffering. The Ogbanje tradition shows the Igbo capacity to transform grief into spiritual meaning and communal healing.',
        culturalContext: 'The Ogbanje concept is one of the most documented aspects of Igbo spirituality. It parallels the Yoruba concept of Abiku. Both represent indigenous psychological and spiritual responses to high infant mortality rates in pre-modern Nigeria. The concept was brought to global attention by Chinua Achebe and later Ben Okri (The Famished Road).',
        themes: ['life and death', 'spirit world', 'grief', 'healing', 'indigenous medicine', 'reincarnation'],
        historicalPeriod: 'Pre-colonial to present Igboland',
        geographicOrigin: 'Southeast Nigeria, Igboland',
        characters: [
          { name: 'The Ogbanje', role: 'Spirit being', significance: 'Represents the liminal space between life and death; embodies Igbo understanding of infant mortality' },
          { name: 'The Dibia', role: 'Traditional healer/diviner', significance: 'The community\'s spiritual specialist who mediates between the living and spirit worlds' },
        ],
        difficultTerms: [
          { term: 'Ogbanje', meaning: 'Spirit child who repeatedly dies and is reborn to the same mother', language: 'igbo' },
          { term: 'Iyi-uwa', meaning: 'The object buried in the spirit world that binds an Ogbanje to the cycle of death and rebirth', language: 'igbo' },
          { term: 'Dibia', meaning: 'Igbo traditional doctor, diviner, and spiritual healer', language: 'igbo' },
          { term: 'Ani Mmo', meaning: 'The spirit world or land of the dead in Igbo cosmology', language: 'igbo' },
        ],
        educationalValue: 'Invaluable for understanding Igbo cosmology, indigenous medicine, and the cultural context of Chinua Achebe\'s literature.',
        analyzedAt: new Date(),
      },
    },
    {
      title: 'The Founding of Ile-Ife — Where the World Began',
      content: `In the beginning, the world was nothing but water and marsh. The Supreme Being, Olodumare, looked down and decided to create solid earth. He called upon Obatala, the arch-divinity of creation, and gave him a calabash of sand, a five-toed hen, and a palm nut.\n\nObatala descended from the heavens on a chain of iron. He poured the sand onto the water, and the hen scratched it in all directions, creating land. Where the land first solidified, that place was called Ile-Ife — "the house that spreads" or "the place of expansion."\n\nBut Obatala had drunk too much palm wine on his descent and was unsteady. In his drunken state, he began to mould the first humans from clay — and some came out misshapen. This is why Obatala is the patron deity of those born with physical differences; he takes special responsibility for them.\n\nOlodumare breathed life into the clay figures, and humanity began.\n\nIle-Ife, in present-day Osun State, remains the spiritual capital of the Yoruba world. Every Yoruba person, no matter where they live — in Lagos, London, or New York — traces their spiritual origin to Ile-Ife. The Ooni of Ife is still regarded as the spiritual father of all Yoruba people.`,
      language: 'yoruba',
      knowledgeType: 'oral_history',
      contributor: contributor._id,
      isPublished: true,
      isFeatured: false,
      tags: ['ile-ife', 'creation', 'obatala', 'olodumare', 'yoruba', 'origin', 'cosmology'],
      analysis: {
        status: 'completed',
        summary: 'The Yoruba creation myth describing how Obatala descended from heaven on Olodumare\'s command to create the earth at Ile-Ife using sand and a hen, and how he moulded the first humans from clay while intoxicated — explaining both human diversity and Obatala\'s role as patron of the differently-abled.',
        moralLesson: 'Even divine beings make mistakes; what matters is taking responsibility. Ile-Ife teaches that all people share a common origin and deserve equal dignity.',
        culturalContext: 'The Ile-Ife creation narrative is the central cosmological story of Yoruba religion (Ifá). Ile-Ife is a real city in Osun State and has been continuously inhabited for over 4,000 years. Archaeological finds including bronze heads confirm its status as a major ancient civilisation centre.',
        themes: ['creation', 'divine responsibility', 'human origin', 'disability', 'spiritual geography'],
        historicalPeriod: 'Mythological/Pre-dynastic Yorubaland',
        geographicOrigin: 'Ile-Ife, Osun State, Southwest Nigeria',
        characters: [
          { name: 'Olodumare', role: 'Supreme Being', significance: 'The ultimate creator deity in Yoruba religion; delegates creation to Obatala' },
          { name: 'Obatala', role: 'Arch-divinity of creation', significance: 'Patron of human creation and of those with physical differences; his drunkenness explains human imperfection' },
        ],
        difficultTerms: [
          { term: 'Olodumare', meaning: 'The Supreme Being in Yoruba religion; the source of all existence', language: 'yoruba' },
          { term: 'Obatala', meaning: 'Orisha (deity) of creation, purity, and human form; wears white', language: 'yoruba' },
          { term: 'Ile-Ife', meaning: 'Literally "the house that spreads"; the sacred city of Yoruba origin', language: 'yoruba' },
          { term: 'Ooni', meaning: 'The king/spiritual ruler of Ile-Ife; considered the father of all Yoruba', language: 'yoruba' },
        ],
        educationalValue: 'Essential for understanding Yoruba religion, cosmology, and the archaeological significance of Ile-Ife as an ancient African civilisation.',
        analyzedAt: new Date(),
      },
    },
    {
      title: 'Nri Kingdom and the Origin of Igbo Civilisation',
      content: `Before the British arrived, before the slave trade, before even the great Benin Kingdom reached its height, there existed in the heart of Igboland a sacred kingdom unlike any other — the Kingdom of Nri.\n\nNri did not conquer with armies. It conquered with ritual authority. The Eze Nri (king of Nri) held the power to cleanse abominations — acts that violated the sacred order of the earth goddess Ani. When a community committed an abomination, they sent for the Nri priests, who alone could perform the cleansing rituals.\n\nThis gave Nri extraordinary influence across Igboland without a single soldier. Communities that accepted Nri ritual authority also accepted Nri's prohibition on human sacrifice and the killing of twins — practices that Nri considered abominations against Ani.\n\nThe Igbo-Ukwu archaeological site, near the ancient Nri sphere of influence, has yielded bronze works of extraordinary sophistication dating to the 9th century CE — predating the famous Benin bronzes by centuries. These bronzes show a society with advanced metallurgy, long-distance trade networks, and complex ritual life.\n\nThe Nri Kingdom is considered by many scholars to be the oldest kingdom in Nigeria, with oral traditions placing its founding at around 900 CE.`,
      language: 'igbo',
      knowledgeType: 'historical_event',
      contributor: admin._id,
      isPublished: true,
      isFeatured: false,
      tags: ['nri', 'igbo', 'kingdom', 'bronze', 'igbo-ukwu', 'ani', 'ritual', 'history'],
      analysis: {
        status: 'completed',
        summary: 'The history of the Nri Kingdom — the oldest kingdom in Nigeria (~900 CE) — which exercised ritual rather than military authority across Igboland through the Eze Nri\'s power to cleanse abominations. The Igbo-Ukwu bronzes confirm a sophisticated 9th-century civilisation predating the Benin bronzes.',
        moralLesson: 'True authority can be built on moral and spiritual legitimacy rather than force. The Nri model shows that peace and civilisation can be maintained through shared values.',
        culturalContext: 'The Nri Kingdom\'s prohibition on human sacrifice and twin-killing represents an indigenous human rights tradition predating European contact. The Igbo-Ukwu bronzes are among the most important archaeological finds in Africa and are housed in the National Museum, Lagos.',
        themes: ['ritual authority', 'ancient civilisation', 'indigenous governance', 'archaeology', 'human rights'],
        historicalPeriod: 'circa 900 CE onwards, pre-colonial Igboland',
        geographicOrigin: 'Nri, Anambra State, Southeast Nigeria',
        characters: [
          { name: 'Eze Nri', role: 'Sacred King', significance: 'Held ritual authority to cleanse abominations; his power was spiritual, not military' },
          { name: 'Ani', role: 'Earth Goddess', significance: 'The supreme moral authority in Igbo cosmology; violations of her laws required Nri cleansing' },
        ],
        difficultTerms: [
          { term: 'Eze Nri', meaning: 'The sacred king of the Nri Kingdom; a ritual rather than military ruler', language: 'igbo' },
          { term: 'Ani', meaning: 'The earth goddess in Igbo religion; the ultimate moral authority and source of fertility', language: 'igbo' },
          { term: 'Abomination (Alu)', meaning: 'An act that violates the sacred order of Ani; requires ritual cleansing', language: 'igbo' },
        ],
        educationalValue: 'Critical for understanding pre-colonial African governance, indigenous human rights, and the archaeological evidence for advanced Nigerian civilisations.',
        analyzedAt: new Date(),
      },
    },
    {
      title: 'Sharo — The Fulani Flogging Festival of Courage',
      content: `Every year, in communities across northern Nigeria and the Sahel, young Fulani men gather for one of the most dramatic coming-of-age ceremonies in West Africa — the Sharo festival.\n\nSharo is a test of courage and endurance. A young man, typically between 17 and 25, stands before his community — his family, his peers, the elders, and the girls he hopes to impress — and is flogged across the chest and back with a whip or cane.\n\nHe must not flinch. He must not cry out. He must not show pain. He stands straight, sometimes even smiling, as the blows land. If he endures without reaction, he is celebrated as a man of courage (jarumi). If he flinches or cries, he faces social shame — though he may try again the following year.\n\nThe ceremony is accompanied by music, dancing, and elaborate dress. Young men wear their finest clothes and jewellery. The atmosphere is festive, not grim.\n\nSharo is not merely about pain tolerance. It is about demonstrating the Fulani values of stoicism, self-control, and dignity under pressure — qualities essential for a people who historically lived as nomadic cattle herders facing harsh environments, cattle raiders, and the constant challenges of the open road.`,
      language: 'hausa',
      knowledgeType: 'ceremony',
      contributor: contributor._id,
      isPublished: true,
      isFeatured: false,
      tags: ['sharo', 'fulani', 'ceremony', 'coming-of-age', 'courage', 'northern nigeria'],
      analysis: {
        status: 'completed',
        summary: 'Description of the Sharo festival — a Fulani coming-of-age ceremony where young men are publicly flogged and must endure without showing pain to prove courage and earn adult status. The ceremony reflects core Fulani values of stoicism and self-control rooted in their nomadic pastoral heritage.',
        moralLesson: 'True courage is not the absence of pain but the mastery of one\'s response to it. Community witnessing of personal trials creates shared values and social bonds.',
        culturalContext: 'Sharo (also called Shadi or Shadi in some communities) is practised across Fulani communities from Nigeria to Senegal. It is one of several Fulani initiation ceremonies. The Fulani are one of the largest ethnic groups in Africa, spread across 20+ countries.',
        themes: ['courage', 'coming-of-age', 'community', 'stoicism', 'nomadic culture', 'identity'],
        historicalPeriod: 'Pre-colonial to present, Fulani communities',
        geographicOrigin: 'Northern Nigeria and West African Sahel',
        characters: [
          { name: 'The Young Initiate', role: 'Protagonist', significance: 'Represents the transition from boyhood to manhood through public endurance' },
          { name: 'The Community', role: 'Witness/Judge', significance: 'The collective whose approval validates the young man\'s courage and adult status' },
        ],
        difficultTerms: [
          { term: 'Sharo', meaning: 'Fulani flogging/endurance ceremony marking the transition to manhood', language: 'hausa' },
          { term: 'Jarumi', meaning: 'A courageous, brave person in Hausa/Fulani culture; a hero', language: 'hausa' },
        ],
        educationalValue: 'Excellent for studying rites of passage, cultural identity, and the relationship between environment and cultural values.',
        analyzedAt: new Date(),
      },
    },
    {
      title: 'Naija Hustle — The Spirit of Lagos',
      content: `If you never don enter Lagos, you never don see hustle. From Oshodi to Victoria Island, from Agege bread seller wey wake 4am to the Lekki lawyer wey dey bill by the minute — Lagos na the city wey never sleep, never rest, never give up.\n\nDem say Lagos na no man's land. But that na lie. Lagos belong to everybody wey get the mind to stay. The Yoruba man, the Igbo trader, the Hausa mai-suya, the Lebanese businessman, the Ghanaian nurse — all of dem don become Lagosian.\n\nThe hustle spirit — wey dem call "Eko Oni Baje" (Lagos will not spoil) — na the real indigenous knowledge of this city. How to survive go-slow wey last four hours. How to negotiate price for market. How to find light when NEPA take light. How to laugh when everything hard.\n\nOur grandmothers carry this knowledge from the village to the city. The woman wey sell ogi for Mushin — she know how to wake before dawn, how to keep customer, how to save small small until she fit send pikin to university.\n\nThis na the oral tradition of modern Nigeria. Not just folktale from ancient time — but the living wisdom of survival, community, and joy in the middle of chaos.`,
      language: 'pidgin',
      knowledgeType: 'community_history',
      contributor: judge._id,
      isPublished: true,
      isFeatured: true,
      tags: ['lagos', 'pidgin', 'hustle', 'urban', 'community', 'survival', 'modern'],
      analysis: {
        status: 'completed',
        summary: 'A Nigerian Pidgin celebration of Lagos\'s "hustle spirit" — the living oral tradition of urban survival, community resilience, and joy that defines the city. Frames modern urban wisdom as legitimate indigenous knowledge passed from grandmothers to grandchildren.',
        moralLesson: 'Indigenous knowledge is not only ancient — it is living, evolving, and found in the daily survival strategies of ordinary people. The wisdom of the market woman is as valuable as the wisdom of the elder.',
        culturalContext: 'Lagos is Africa\'s largest city with 20+ million people. Nigerian Pidgin (Naijá) is spoken by over 75 million Nigerians as a lingua franca. "Eko Oni Baje" is a famous Lagos motto. Mai-suya refers to Hausa suya (spiced meat) vendors, a ubiquitous Lagos institution.',
        themes: ['urban life', 'resilience', 'multiculturalism', 'survival', 'community wisdom', 'modernity'],
        historicalPeriod: 'Contemporary Lagos, 20th–21st century',
        geographicOrigin: 'Lagos, Southwest Nigeria',
        difficultTerms: [
          { term: 'Eko Oni Baje', meaning: 'Yoruba phrase meaning "Lagos will not spoil/fail"; the city\'s unofficial motto of resilience', language: 'yoruba' },
          { term: 'Mai-suya', meaning: 'Hausa term for suya (spiced grilled meat) vendor; a cultural institution across Nigerian cities', language: 'hausa' },
          { term: 'NEPA', meaning: 'National Electric Power Authority; colloquial term for Nigeria\'s electricity provider, synonymous with power cuts', language: 'pidgin' },
          { term: 'Ogi', meaning: 'Fermented cereal porridge; a common breakfast food sold by street vendors', language: 'yoruba' },
        ],
        educationalValue: 'Demonstrates that oral tradition and indigenous knowledge are not frozen in the past but continue to evolve in urban, contemporary contexts.',
        analyzedAt: new Date(),
      },
    },
  ]);
  console.log(`Created ${stories.length} stories`);

  // ── STORIES ────────────────────────────────────────────────────────────────
  const stories = await Story.insertMany([
    {
      title: 'Ijapa ati Ẹyẹ — The Tortoise and the Birds',
      content: `Long ago, when animals could speak and the sky held feasts, Ijapa the tortoise heard that the birds were invited to a great celebration in the heavens. Ijapa, always cunning, begged each bird for a single feather until he had enough to fashion wings for himself.\n\nBefore they departed, Ijapa announced: "In the land above, we must each take a new name. My name shall be 'All of You'." The birds, amused, agreed.\n\nWhen the feast was laid out and the sky people asked who the food was for, the host replied: "It is for all of you." Ijapa stepped forward and ate everything, for his name was All of You.\n\nThe birds, furious and hungry, each took back their feather before the descent. Ijapa, featherless, sent a message to his wife through a passing bird — but the bird, still angry, told her to bring out all the hard things in the house. When Ijapa fell from the sky, he landed on iron pots and grinding stones, shattering his shell into a hundred pieces.\n\nThe medicine man pieced him back together, which is why the tortoise shell has many lines to this day.`,
      language: 'yoruba',
      knowledgeType: 'folktale',
      contributor: contributor._id,
      isPublished: true,
      isFeatured: true,
      tags: ['tortoise', 'birds', 'trickster', 'sky', 'yoruba', 'ijapa'],
      analysis: {
        status: 'completed',
        summary: 'A classic Yoruba trickster tale about Ijapa the tortoise who deceives birds to attend a sky feast, eats all the food under the name "All of You", and suffers the consequences when the birds reclaim their feathers.',
        moralLesson: 'Greed and deception ultimately lead to one\'s own downfall.',
        culturalContext: 'Ijapa is the archetypal trickster in Yoruba oral tradition. These tales were told at night around fires to teach children moral values.',
        themes: ['trickery', 'greed', 'consequences', 'community'],
        historicalPeriod: 'Pre-colonial Yorubaland',
        geographicOrigin: 'Southwest Nigeria',
        characters: [
          { name: 'Ijapa', role: 'Protagonist/Trickster', significance: 'Represents cunning without wisdom' },
          { name: 'The Birds', role: 'Victims', significance: 'Represent the community Ijapa exploits' },
        ],
        difficultTerms: [
          { term: 'Ijapa', meaning: 'Tortoise in Yoruba; the classic trickster character', language: 'yoruba' },
        ],
        educationalValue: 'Teaches ethics and consequences of deception. Suitable for primary school moral education.',
        analyzedAt: new Date(),
      },
    },
    {
      title: 'Malam Isa da Kura — The Scholar and the Hyena',
      content: `A long time ago in the ancient city of Kano, there lived a learned Islamic scholar named Malam Isa who was known for his wisdom and his pride. He had memorised the entire Quran and could recite hadith from memory, yet he looked down on those less educated than himself.\n\nOne evening, walking home from the mosque, Malam Isa encountered a hyena sitting calmly in the road. In Hausa belief, the hyena is associated with witches and the spirit world.\n\n"Move aside, beast," said Malam Isa. "Do you not know who I am?"\n\nThe hyena spoke: "I know exactly who you are, Malam. You are a man who has filled his head with knowledge but emptied his heart of humility."\n\nMalam Isa was so shocked that he fell to his knees. When he looked up, the hyena was gone. In its place sat an old beggar woman he had passed every day without acknowledgement.\n\nFrom that day, Malam Isa greeted every person he met, learned or unlearned, rich or poor. He became known not just as the most knowledgeable man in Kano, but as the wisest.`,
      language: 'hausa',
      knowledgeType: 'folktale',
      contributor: contributor._id,
      isPublished: true,
      isFeatured: true,
      tags: ['hyena', 'scholar', 'kano', 'humility', 'hausa', 'wisdom'],
      analysis: {
        status: 'completed',
        summary: 'A Hausa folktale about a proud Islamic scholar humbled by a speaking hyena — revealed to be a disguised beggar woman — who learns that true wisdom requires humility.',
        moralLesson: 'Knowledge without humility is worthless. True wisdom is shown through how we treat others.',
        culturalContext: 'Blends Hausa indigenous belief (hyena as spirit-world messenger) with Islamic values of humility. Common in northern Nigeria where Islam has been practised for 700+ years alongside older Hausa traditions.',
        themes: ['humility', 'knowledge vs wisdom', 'spiritual warning', 'social equality'],
        historicalPeriod: 'Kano Emirate period',
        geographicOrigin: 'Kano, Northern Nigeria',
        characters: [
          { name: 'Malam Isa', role: 'Protagonist', significance: 'Represents the danger of intellectual pride' },
          { name: 'The Hyena/Beggar Woman', role: 'Supernatural messenger', significance: 'Reveals the scholar\'s blindness to human dignity' },
        ],
        difficultTerms: [
          { term: 'Malam', meaning: 'Islamic scholar or learned man in Hausa; a title of respect', language: 'hausa' },
          { term: 'Kura', meaning: 'Hyena in Hausa; associated with witchcraft and the spirit world', language: 'hausa' },
        ],
        educationalValue: 'Excellent for teaching the intersection of religion and indigenous belief, and discussions on social class.',
        analyzedAt: new Date(),
      },
    },
    {
      title: 'Ogbanje — The Spirit Child Who Returns',
      content: `Among the Igbo people, there exists a class of spirit beings called Ogbanje — children who are born, die young, and are reborn to the same mother, over and over, in a cycle of grief.\n\nThey are not evil. They are spirits who have not yet decided to stay in the world of the living. They keep one foot in the spirit world (Ani Mmo) and one in the human world.\n\nWhen a child dies repeatedly in a family, the dibia (traditional doctor) is called. Through divination, he seeks the iyi-uwa — the stone or object that binds the Ogbanje to the spirit world. If found and destroyed, the child's spirit agrees to stay.\n\nChinua Achebe immortalised the Ogbanje in Things Fall Apart through the character of Ezinma. But long before Achebe, every Igbo grandmother knew the signs: a child born with unusual markings, who smiled too knowingly, who seemed to look at things others could not see.\n\nModern medicine calls it infant mortality. The Igbo called it Ogbanje — and built an entire spiritual framework to understand, grieve, and heal from it.`,
      language: 'igbo',
      knowledgeType: 'tradition',
      contributor: admin._id,
      isPublished: true,
      isFeatured: true,
      tags: ['ogbanje', 'spirit child', 'igbo', 'dibia', 'iyi-uwa', 'reincarnation'],
      analysis: {
        status: 'completed',
        summary: 'An explanation of the Igbo spiritual concept of Ogbanje — spirit children who cycle between the living and spirit worlds. Includes the healing ceremony to destroy the iyi-uwa and end the cycle.',
        moralLesson: 'Every culture develops frameworks to understand suffering. The Ogbanje tradition shows the Igbo capacity to transform grief into spiritual meaning and communal healing.',
        culturalContext: 'Parallels the Yoruba concept of Abiku. Both represent indigenous responses to high infant mortality. Brought to global attention by Chinua Achebe and Ben Okri.',
        themes: ['life and death', 'spirit world', 'grief', 'healing', 'indigenous medicine'],
        historicalPeriod: 'Pre-colonial to present Igboland',
        geographicOrigin: 'Southeast Nigeria',
        characters: [
          { name: 'The Ogbanje', role: 'Spirit being', significance: 'Embodies Igbo understanding of infant mortality' },
          { name: 'The Dibia', role: 'Traditional healer', significance: 'Mediates between the living and spirit worlds' },
        ],
        difficultTerms: [
          { term: 'Ogbanje', meaning: 'Spirit child who repeatedly dies and is reborn to the same mother', language: 'igbo' },
          { term: 'Iyi-uwa', meaning: 'Object binding the Ogbanje to the cycle of death and rebirth', language: 'igbo' },
          { term: 'Dibia', meaning: 'Igbo traditional doctor, diviner, and spiritual healer', language: 'igbo' },
        ],
        educationalValue: 'Invaluable for understanding Igbo cosmology and the cultural context of Chinua Achebe\'s literature.',
        analyzedAt: new Date(),
      },
    },
    {
      title: 'Sharo — The Fulani Flogging Festival of Courage',
      content: `Every year, in communities across northern Nigeria, young Fulani men gather for one of the most dramatic coming-of-age ceremonies in West Africa — the Sharo festival.\n\nSharo is a test of courage and endurance. A young man stands before his community and is flogged across the chest and back with a whip. He must not flinch. He must not cry out. He must not show pain. If he endures without reaction, he is celebrated as a man of courage (jarumi). If he flinches, he faces social shame — though he may try again the following year.\n\nThe ceremony is accompanied by music, dancing, and elaborate dress. Young men wear their finest clothes and jewellery.\n\nSharo is not merely about pain tolerance. It is about demonstrating the Fulani values of stoicism, self-control, and dignity under pressure — qualities essential for a people who historically lived as nomadic cattle herders facing harsh environments and constant challenges of the open road.`,
      language: 'hausa',
      knowledgeType: 'ceremony',
      contributor: contributor._id,
      isPublished: true,
      isFeatured: false,
      tags: ['sharo', 'fulani', 'ceremony', 'coming-of-age', 'courage', 'northern nigeria'],
      analysis: {
        status: 'completed',
        summary: 'The Sharo festival — a Fulani coming-of-age ceremony where young men are publicly flogged and must endure without showing pain to prove courage and earn adult status.',
        moralLesson: 'True courage is not the absence of pain but the mastery of one\'s response to it.',
        culturalContext: 'Practised across Fulani communities from Nigeria to Senegal. Reflects nomadic pastoral heritage and core Fulani identity values.',
        themes: ['courage', 'coming-of-age', 'community', 'stoicism', 'nomadic culture'],
        historicalPeriod: 'Pre-colonial to present',
        geographicOrigin: 'Northern Nigeria and West African Sahel',
        characters: [
          { name: 'The Young Initiate', role: 'Protagonist', significance: 'Transition from boyhood to manhood through public endurance' },
        ],
        difficultTerms: [
          { term: 'Sharo', meaning: 'Fulani flogging ceremony marking the transition to manhood', language: 'hausa' },
          { term: 'Jarumi', meaning: 'A courageous, brave person in Hausa/Fulani culture', language: 'hausa' },
        ],
        educationalValue: 'Excellent for studying rites of passage and the relationship between environment and cultural values.',
        analyzedAt: new Date(),
      },
    },
    {
      title: 'Naija Hustle — The Spirit of Lagos',
      content: `If you never don enter Lagos, you never don see hustle. From Oshodi to Victoria Island, from Agege bread seller wey wake 4am to the Lekki lawyer wey dey bill by the minute — Lagos na the city wey never sleep, never rest, never give up.\n\nDem say Lagos na no man's land. But that na lie. Lagos belong to everybody wey get the mind to stay. The Yoruba man, the Igbo trader, the Hausa mai-suya, the Lebanese businessman — all of dem don become Lagosian.\n\nThe hustle spirit — wey dem call "Eko Oni Baje" (Lagos will not spoil) — na the real indigenous knowledge of this city. How to survive go-slow wey last four hours. How to negotiate price for market. How to find light when NEPA take light. How to laugh when everything hard.\n\nOur grandmothers carry this knowledge from the village to the city. The woman wey sell ogi for Mushin — she know how to wake before dawn, how to keep customer, how to save small small until she fit send pikin to university.\n\nThis na the oral tradition of modern Nigeria.`,
      language: 'pidgin',
      knowledgeType: 'community_history',
      contributor: judge._id,
      isPublished: true,
      isFeatured: true,
      tags: ['lagos', 'pidgin', 'hustle', 'urban', 'community', 'survival'],
      analysis: {
        status: 'completed',
        summary: 'A Nigerian Pidgin celebration of Lagos\'s hustle spirit — the living oral tradition of urban survival and community resilience that defines the city.',
        moralLesson: 'Indigenous knowledge is not only ancient — it is living and found in the daily survival strategies of ordinary people.',
        culturalContext: '"Eko Oni Baje" is a famous Lagos motto. Nigerian Pidgin is spoken by 75+ million Nigerians as a lingua franca.',
        themes: ['urban life', 'resilience', 'multiculturalism', 'survival', 'community wisdom'],
        historicalPeriod: 'Contemporary Lagos, 20th–21st century',
        geographicOrigin: 'Lagos, Southwest Nigeria',
        difficultTerms: [
          { term: 'Eko Oni Baje', meaning: 'Yoruba: "Lagos will not spoil/fail"; the city\'s motto of resilience', language: 'yoruba' },
          { term: 'Mai-suya', meaning: 'Hausa suya (spiced grilled meat) vendor', language: 'hausa' },
        ],
        educationalValue: 'Demonstrates that oral tradition continues to evolve in urban contemporary contexts.',
        analyzedAt: new Date(),
      },
    },
  ]);
  console.log(`Created ${stories.length} stories`);

  // ── PROVERBS ───────────────────────────────────────────────────────────────
  const proverbs = await Proverb.insertMany([
    {
      original: 'Bi a bá fẹ́ mọ ẹni, a wo ọ̀rẹ́ rẹ̀',
      transliteration: 'Bi a ba fe mo eni, a wo ore re',
      englishTranslation: 'If you want to know a person, look at their friends',
      meaning: 'A person\'s character is reflected in the company they keep. Choose your associations wisely.',
      usage: 'Used when advising young people about peer influence, or when judging someone\'s character by their social circle.',
      language: 'yoruba',
      tribe: 'Yoruba',
      tags: ['friendship', 'character', 'wisdom', 'social'],
      isVerified: true,
      contributor: contributor._id,
    },
    {
      original: 'Ọmọ tí a kò kọ́ ni yóò ta ilé tì',
      transliteration: 'Omo ti a ko ko ni yoo ta ile ti',
      englishTranslation: 'A child that is not taught will sell the family home',
      meaning: 'Children who are not properly educated and instilled with values will eventually destroy what their parents built.',
      usage: 'Used to emphasise the importance of education and moral upbringing.',
      language: 'yoruba',
      tribe: 'Yoruba',
      tags: ['education', 'children', 'family', 'responsibility'],
      isVerified: true,
      contributor: contributor._id,
    },
    {
      original: 'Duk wanda ya yi gaba da ruwa, ruwa zai yi gaba da shi',
      transliteration: 'Duk wanda ya yi gaba da ruwa, ruwa zai yi gaba da shi',
      englishTranslation: 'Whoever fights against water, water will fight against them',
      meaning: 'Do not resist what is natural and inevitable. Fighting against the natural order brings destruction upon yourself.',
      usage: 'Used when someone stubbornly resists change or natural consequences.',
      language: 'hausa',
      tribe: 'Hausa',
      tags: ['nature', 'resistance', 'wisdom', 'inevitability'],
      isVerified: true,
      contributor: contributor._id,
    },
    {
      original: 'Mutum ya fi dukiyarsa',
      transliteration: 'Mutum ya fi dukiyarsa',
      englishTranslation: 'A person is worth more than their wealth',
      meaning: 'Human dignity and relationships are more valuable than material possessions.',
      usage: 'Used to comfort someone who has lost wealth, or to caution against prioritising money over people.',
      language: 'hausa',
      tribe: 'Hausa',
      tags: ['wealth', 'dignity', 'humanity', 'values'],
      isVerified: true,
      contributor: admin._id,
    },
    {
      original: 'Onye wetara oji wetara ndụ',
      transliteration: 'Onye wetara oji wetara ndu',
      englishTranslation: 'He who brings kola nut brings life',
      meaning: 'Hospitality and the act of welcoming guests with kola nut is a sacred life-affirming act in Igbo culture.',
      usage: 'Said at the beginning of ceremonies when kola nut is presented; emphasises the sacred nature of hospitality.',
      language: 'igbo',
      tribe: 'Igbo',
      tags: ['hospitality', 'kola nut', 'ceremony', 'sacred', 'life'],
      isVerified: true,
      contributor: admin._id,
    },
    {
      original: 'Egbe bere, ugo bere, nke si ibe ya ebela nku kwa ya',
      transliteration: 'Egbe bere, ugo bere, nke si ibe ya ebela nku kwa ya',
      englishTranslation: 'Let the kite perch, let the eagle perch; whichever says the other should not perch, let its wing break',
      meaning: 'Live and let live. Coexistence and mutual respect are essential. Those who deny others their rights will suffer consequences.',
      usage: 'Used in conflict resolution, community meetings, and when advocating for tolerance and peaceful coexistence.',
      language: 'igbo',
      tribe: 'Igbo',
      tags: ['coexistence', 'tolerance', 'peace', 'justice', 'community'],
      isVerified: true,
      contributor: admin._id,
    },
    {
      original: 'No condition is permanent',
      transliteration: 'No kondishon dey permanent',
      englishTranslation: 'No condition is permanent',
      meaning: 'Both good and bad situations are temporary. This gives hope in hardship and humility in success.',
      usage: 'Painted on trucks, buses, and walls across Nigeria. Used as encouragement during difficult times.',
      language: 'pidgin',
      tribe: 'Pan-Nigerian',
      tags: ['hope', 'resilience', 'change', 'philosophy', 'urban'],
      isVerified: true,
      contributor: judge._id,
    },
    {
      original: 'Ọjị dị mma n\'aka onye wetara ya',
      transliteration: 'Oji di mma n\'aka onye wetara ya',
      englishTranslation: 'The kola nut is good in the hands of the one who brought it',
      meaning: 'The giver of a gift has the right to present and bless it. Respect the protocols of giving.',
      usage: 'Said during kola nut ceremonies to remind guests to wait for the host to present and pray over the kola before it is broken.',
      language: 'igbo',
      tribe: 'Igbo',
      tags: ['kola nut', 'protocol', 'respect', 'ceremony'],
      isVerified: true,
      contributor: admin._id,
    },
  ]);
  console.log(`Created ${proverbs.length} proverbs`);

  // ── CHAT SESSIONS ──────────────────────────────────────────────────────────
  await Chat.insertMany([
    {
      user: judge._id,
      title: 'Exploring Yoruba Trickster Tales',
      relatedStories: [stories[0]._id],
      messageCount: 4,
      messages: [
        { role: 'user', content: 'Tell me about the Ijapa tortoise stories in Yoruba culture.' },
        { role: 'assistant', content: 'Ijapa (the tortoise) is the quintessential trickster figure in Yoruba oral tradition — cunning, self-serving, and ultimately undone by his own greed. The Ijapa and the Birds story you have in the platform is one of the most beloved examples. Ijapa borrows feathers from birds to attend a sky feast, names himself "All of You" so he can claim all the food, and then falls to earth when the birds reclaim their feathers. The cracked tortoise shell is the origin story that explains why tortoises look the way they do today. These tales served as moral instruction for children — entertaining enough to hold attention, pointed enough to teach values.' },
        { role: 'user', content: 'How does Ijapa compare to Anansi the spider?' },
        { role: 'assistant', content: 'Excellent comparison! Both Ijapa and Anansi are West African trickster archetypes who share remarkable similarities — they are small, physically weak creatures who use intelligence and deception to overcome stronger opponents. Anansi originates from the Akan people of Ghana and was carried to the Caribbean and Americas through the slave trade, where he evolved into a symbol of enslaved people\'s resistance and survival. Ijapa stayed rooted in Yoruba West Africa. Both characters reflect a worldview where cleverness is the great equaliser — the small can outwit the powerful. The key difference is that Ijapa\'s stories more consistently show him being punished for his greed, reinforcing Yoruba moral values, while Anansi often escapes consequence, reflecting a different cultural emphasis on survival at any cost.' },
        { role: 'user', content: 'What other trickster figures exist in Nigerian traditions?' },
        { role: 'assistant', content: 'Nigeria has rich trickster traditions across its cultures. In Igbo tradition, the tortoise (Mbe) plays a similar role to Ijapa — cunning, greedy, and often punished. The Mbe stories share many plot structures with Ijapa tales, suggesting deep cultural exchange across Yoruba-Igbo borders. In Hausa tradition, the trickster is often a clever poor man (talaka) who outwits the wealthy or powerful through wit. There are also hyena trickster tales in Hausa folklore. The Efik and Ibibio people of Cross River State have Tortoise tales too. What is fascinating is that across all these traditions, the trickster serves the same social function: giving voice to the powerless, teaching that intelligence matters more than strength, and warning that unchecked greed destroys the trickster himself.' },
      ],
    },
    {
      user: judge._id,
      title: 'Igbo Spiritual Concepts — Ogbanje and Chi',
      relatedStories: [stories[2]._id],
      messageCount: 3,
      messages: [
        { role: 'user', content: 'Explain the Igbo concept of Chi and how it relates to Ogbanje.' },
        { role: 'assistant', content: 'In Igbo cosmology, Chi is your personal spiritual guardian — a divine spark assigned to you before birth that shapes your destiny. The Igbo say "Onye kwe, Chi ya ekwe" — when a person agrees, their Chi agrees. Your Chi is your personal god, your inner divine nature. It is distinct from your soul (mmuo) and your life force. The relationship between Chi and Ogbanje is profound: an Ogbanje is a spirit being whose Chi has not fully committed to the human world. Their Chi remains partially in Ani Mmo (the spirit world), which is why they keep returning there through death. The iyi-uwa — the binding object — represents this unresolved spiritual contract. When the dibia destroys the iyi-uwa, he is essentially renegotiating the Ogbanje\'s spiritual contract, convincing the Chi to fully commit to the living world.' },
        { role: 'user', content: 'Is there a Yoruba equivalent to Ogbanje?' },
        { role: 'assistant', content: 'Yes — the Yoruba concept of Abiku is almost identical to Ogbanje and the parallel is one of the most studied examples of cultural convergence in Nigerian scholarship. Abiku literally means "born to die" in Yoruba. Like Ogbanje, Abiku children are believed to be spirit beings who cycle between the living and spirit worlds, causing repeated infant deaths in the same family. The Yoruba response is also similar: consulting a babalawo (diviner), performing rituals, and sometimes marking the child\'s body (scarification or cutting) so the spirit can be identified if it returns. Wole Soyinka wrote a famous poem called "Abiku" and J.P. Clark wrote another — both exploring this concept. Ben Okri\'s Booker Prize-winning novel The Famished Road features an Abiku narrator. The convergence of Ogbanje and Abiku across Igbo and Yoruba cultures — two distinct peoples — suggests either shared ancient origins or parallel responses to the universal human experience of infant mortality.' },
        { role: 'user', content: 'How should educators approach teaching these concepts sensitively?' },
        { role: 'assistant', content: 'Teaching Ogbanje and Abiku requires cultural humility and contextual framing. Key principles: First, present these as sophisticated indigenous psychological and spiritual frameworks, not superstition — they represent how communities made meaning of devastating loss before modern medicine. Second, connect them to universal human experiences: every culture has developed rituals around infant death and grief. Third, use literature as an entry point — Achebe\'s Ezinma in Things Fall Apart and Okri\'s The Famished Road make these concepts accessible and emotionally resonant. Fourth, acknowledge the real harm that could occur when these beliefs led to neglect of sick children — this is a nuanced conversation about how beliefs interact with practice. Fifth, invite students with Igbo or Yoruba heritage to share family knowledge, creating space for lived experience alongside academic study. The goal is understanding, not judgment.' },
      ],
    },
  ]);
  console.log('Created chat sessions');

  // ── BOOKMARKS ──────────────────────────────────────────────────────────────
  await Bookmark.insertMany([
    { user: judge._id, story: stories[0]._id },
    { user: judge._id, story: stories[2]._id },
    { user: judge._id, story: stories[4]._id },
    { user: contributor._id, story: stories[1]._id },
    { user: contributor._id, story: stories[3]._id },
  ]);
  console.log('Created bookmarks');

  // ── UPLOADS ────────────────────────────────────────────────────────────────
  await Upload.insertMany([
    {
      uploader: contributor._id,
      originalName: 'hausa_proverbs_collection.txt',
      mimeType: 'text/plain',
      uploadType: 'text',
      fileUrl: 'https://res.cloudinary.com/demo/raw/upload/sample_hausa_proverbs.txt',
      fileSizeBytes: 4820,
      extractedText: 'Hausa proverbs collected from elders in Kano State, 2023. Duk wanda ya yi gaba da ruwa... Mutum ya fi dukiyarsa...',
      ocrConfidence: 0.97,
      analysisStatus: 'completed',
      ingestion: {
        detectedLanguage: 'hausa',
        contentType: 'proverb',
        summaries: {
          short: 'A collection of 24 Hausa proverbs from Kano State elders covering themes of wisdom, community, and resilience.',
          medium: 'This document contains 24 verified Hausa proverbs collected from elders in Kano State in 2023. The proverbs cover themes including wisdom, community responsibility, the value of human dignity over wealth, and the importance of patience.',
          detailed: 'A comprehensive collection of Hausa oral wisdom gathered through structured interviews with 8 elders in Kano State. The proverbs span multiple domains: social relations (12), nature and environment (5), spiritual wisdom (4), and practical life advice (3). Several proverbs show clear Islamic influence blended with pre-Islamic Hausa worldview.',
        },
        entities: {
          people: ['Elder Musa Dankano', 'Elder Hauwa Abdullahi'],
          communities: ['Kano', 'Hausa', 'Fulani'],
          places: ['Kano State', 'Northern Nigeria'],
          languages: ['hausa', 'arabic'],
          keywords: ['proverbs', 'wisdom', 'elders', 'oral tradition', 'community'],
        },
        aiUnderstanding: {
          mainTheme: 'Hausa oral wisdom and community values',
          subThemes: ['social responsibility', 'Islamic ethics', 'environmental wisdom', 'human dignity'],
          moralLessons: ['Human dignity surpasses material wealth', 'Community harmony requires mutual respect', 'Patience and perseverance overcome obstacles'],
          culturalMeaning: 'These proverbs represent the distilled wisdom of generations of Hausa people, blending pre-Islamic indigenous values with Islamic ethical principles in a uniquely northern Nigerian synthesis.',
          historicalContext: 'Collected from elders who learned these proverbs from their grandparents, placing their origin in the late 19th to early 20th century Kano Emirate period.',
          educationalValue: 'High — suitable for secondary school Hausa language classes and university-level African studies courses.',
          difficultyLevel: 'intermediate',
          targetAudience: 'Secondary school students, university students, cultural researchers',
        },
        metadata: {
          title: 'Hausa Proverbs of Kano State — Elder Collection 2023',
          tags: ['hausa', 'proverbs', 'kano', 'oral tradition', 'wisdom', 'elders'],
          category: 'proverb',
          estimatedReadingTime: '8 minutes',
          relatedTopics: ['Hausa culture', 'Islamic ethics', 'Northern Nigeria', 'oral tradition'],
        },
        completedAt: new Date(),
      },
    },
    {
      uploader: admin._id,
      originalName: 'igbo_ukwu_bronze_history.txt',
      mimeType: 'text/plain',
      uploadType: 'text',
      fileUrl: 'https://res.cloudinary.com/demo/raw/upload/igbo_ukwu_history.txt',
      fileSizeBytes: 7340,
      extractedText: 'The Igbo-Ukwu archaeological site in Anambra State has yielded some of the most sophisticated bronze works in sub-Saharan Africa...',
      ocrConfidence: 0.99,
      analysisStatus: 'completed',
      ingestion: {
        detectedLanguage: 'english',
        contentType: 'historical_event',
        summaries: {
          short: 'Historical account of the Igbo-Ukwu bronze works — 9th century CE artefacts proving advanced Igbo civilisation predating European contact.',
          medium: 'Detailed history of the Igbo-Ukwu archaeological site discovered in 1939, containing bronze works of extraordinary sophistication dated to the 9th century CE. The artefacts demonstrate advanced metallurgy, long-distance trade networks, and complex ritual life in pre-colonial Igboland.',
          detailed: 'Comprehensive account of the Igbo-Ukwu site, its discovery by Isaiah Anozie in 1939, subsequent excavations by Thurstan Shaw in 1959-1960, and the significance of the finds. The bronzes — created using the lost-wax casting technique — predate the famous Benin bronzes by centuries and challenge Eurocentric narratives about African technological development.',
        },
        entities: {
          people: ['Isaiah Anozie', 'Thurstan Shaw', 'Eze Nri'],
          communities: ['Igbo', 'Nri Kingdom'],
          places: ['Igbo-Ukwu', 'Anambra State', 'Southeast Nigeria'],
          languages: ['igbo', 'english'],
          artifacts: ['bronze vessels', 'ceremonial staff', 'bronze roped pot'],
          historicalEvents: ['Igbo-Ukwu excavation 1959', 'Nri Kingdom founding'],
          keywords: ['bronze', 'archaeology', 'civilisation', 'metallurgy', 'pre-colonial'],
        },
        aiUnderstanding: {
          mainTheme: 'Ancient Igbo civilisation and technological achievement',
          subThemes: ['archaeology', 'metallurgy', 'trade networks', 'ritual culture', 'African history'],
          moralLessons: ['African civilisations achieved technological sophistication independently', 'Material culture preserves history when oral tradition is disrupted'],
          culturalMeaning: 'The Igbo-Ukwu bronzes are physical proof of the sophistication of pre-colonial Igbo society, challenging colonial narratives of African primitiveness.',
          historicalContext: '9th century CE, during the height of the Nri Kingdom\'s influence across Igboland.',
          educationalValue: 'Critical for African history, archaeology, and decolonising the curriculum.',
          difficultyLevel: 'advanced',
          targetAudience: 'University students, researchers, history educators',
        },
        metadata: {
          title: 'Igbo-Ukwu: Archaeological Evidence of Ancient Igbo Civilisation',
          tags: ['igbo-ukwu', 'bronze', 'archaeology', 'igbo', 'nri', 'ancient'],
          category: 'historical_event',
          estimatedReadingTime: '12 minutes',
          relatedTopics: ['Nri Kingdom', 'Benin bronzes', 'African archaeology', 'pre-colonial Nigeria'],
        },
        completedAt: new Date(),
      },
    },
  ]);
  console.log('Created uploads');

  // ── KNOWLEDGE GRAPH ────────────────────────────────────────────────────────
  const nodes = await KnowledgeNode.insertMany([
    { label: 'Ijapa (Tortoise)', nodeType: 'story', language: 'yoruba', description: 'The Yoruba trickster tortoise; protagonist of moral folktales', tags: ['trickster', 'yoruba', 'folktale'], weight: 5, sourceRef: stories[0]._id, sourceModel: 'Story', fingerprint: 'story_ijapa_yoruba' },
    { label: 'Yoruba', nodeType: 'language', language: 'yoruba', description: 'Yoruba language and cultural group of Southwest Nigeria', tags: ['language', 'southwest nigeria'], weight: 8, fingerprint: 'language_yoruba' },
    { label: 'Hausa', nodeType: 'language', language: 'hausa', description: 'Hausa language and cultural group of Northern Nigeria', tags: ['language', 'northern nigeria'], weight: 8, fingerprint: 'language_hausa' },
    { label: 'Igbo', nodeType: 'language', language: 'igbo', description: 'Igbo language and cultural group of Southeast Nigeria', tags: ['language', 'southeast nigeria'], weight: 8, fingerprint: 'language_igbo' },
    { label: 'Ogbanje', nodeType: 'tradition', language: 'igbo', description: 'Igbo spirit child concept — children who cycle between living and spirit worlds', tags: ['spirit', 'igbo', 'tradition'], weight: 6, sourceRef: stories[2]._id, sourceModel: 'Story', fingerprint: 'tradition_ogbanje_igbo' },
    { label: 'Abiku', nodeType: 'tradition', language: 'yoruba', description: 'Yoruba spirit child concept — parallel to Igbo Ogbanje', tags: ['spirit', 'yoruba', 'tradition'], weight: 5, fingerprint: 'tradition_abiku_yoruba' },
    { label: 'Sharo Festival', nodeType: 'festival', language: 'hausa', description: 'Fulani coming-of-age flogging ceremony testing courage', tags: ['ceremony', 'fulani', 'courage'], weight: 4, sourceRef: stories[3]._id, sourceModel: 'Story', fingerprint: 'festival_sharo_hausa' },
    { label: 'Kano', nodeType: 'location', language: 'hausa', description: 'Ancient city in Northern Nigeria; centre of Hausa-Fulani culture', tags: ['city', 'northern nigeria', 'hausa'], weight: 5, fingerprint: 'location_kano' },
    { label: 'Ile-Ife', nodeType: 'location', language: 'yoruba', description: 'Sacred city of Yoruba origin; spiritual capital of the Yoruba world', tags: ['city', 'yoruba', 'sacred'], weight: 6, fingerprint: 'location_ile_ife' },
    { label: 'Trickster', nodeType: 'theme', language: 'english', description: 'Cross-cultural archetype of the cunning, deceptive character who uses wit over strength', tags: ['archetype', 'theme', 'cross-cultural'], weight: 5, fingerprint: 'theme_trickster' },
    { label: 'Humility', nodeType: 'moral_lesson', language: 'english', description: 'The virtue of humility — central moral lesson across Nigerian oral traditions', tags: ['virtue', 'moral', 'wisdom'], weight: 6, fingerprint: 'moral_humility' },
    { label: 'Dibia', nodeType: 'person', language: 'igbo', description: 'Igbo traditional doctor, diviner, and spiritual healer', tags: ['healer', 'igbo', 'spiritual'], weight: 4, fingerprint: 'person_dibia_igbo' },
    { label: 'Lagos', nodeType: 'location', language: 'pidgin', description: 'Africa\'s largest city; melting pot of Nigerian cultures', tags: ['city', 'urban', 'pidgin'], weight: 5, fingerprint: 'location_lagos' },
    { label: 'Kola Nut', nodeType: 'food', language: 'igbo', description: 'Sacred nut used in ceremonies across Nigerian cultures; symbol of hospitality', tags: ['ceremony', 'sacred', 'hospitality'], weight: 5, fingerprint: 'food_kola_nut' },
  ]);
  console.log(`Created ${nodes.length} knowledge graph nodes`);

  // Map labels to node IDs for easy edge creation
  const n = {};
  nodes.forEach(node => { n[node.fingerprint] = node._id; });

  await KnowledgeEdge.insertMany([
    { from: n['story_ijapa_yoruba'], to: n['language_yoruba'], relationship: 'BELONGS_TO', strength: 1.0, description: 'Ijapa tales are core Yoruba oral tradition', fingerprint: 'e_ijapa_yoruba' },
    { from: n['story_ijapa_yoruba'], to: n['theme_trickster'], relationship: 'SAME_THEME', strength: 0.95, description: 'Ijapa is the archetypal Yoruba trickster', fingerprint: 'e_ijapa_trickster' },
    { from: n['tradition_ogbanje_igbo'], to: n['language_igbo'], relationship: 'BELONGS_TO', strength: 1.0, description: 'Ogbanje is a core Igbo spiritual concept', fingerprint: 'e_ogbanje_igbo' },
    { from: n['tradition_ogbanje_igbo'], to: n['tradition_abiku_yoruba'], relationship: 'SIMILAR_TO', strength: 0.92, description: 'Ogbanje and Abiku are parallel spirit-child concepts across Igbo and Yoruba cultures', fingerprint: 'e_ogbanje_abiku' },
    { from: n['tradition_abiku_yoruba'], to: n['language_yoruba'], relationship: 'BELONGS_TO', strength: 1.0, description: 'Abiku is a core Yoruba spiritual concept', fingerprint: 'e_abiku_yoruba' },
    { from: n['festival_sharo_hausa'], to: n['language_hausa'], relationship: 'BELONGS_TO', strength: 1.0, description: 'Sharo is a Fulani/Hausa ceremony', fingerprint: 'e_sharo_hausa' },
    { from: n['location_kano'], to: n['language_hausa'], relationship: 'PART_OF', strength: 0.9, description: 'Kano is the cultural capital of Hausa civilisation', fingerprint: 'e_kano_hausa' },
    { from: n['location_ile_ife'], to: n['language_yoruba'], relationship: 'PART_OF', strength: 1.0, description: 'Ile-Ife is the sacred origin city of the Yoruba', fingerprint: 'e_ife_yoruba' },
    { from: n['person_dibia_igbo'], to: n['tradition_ogbanje_igbo'], relationship: 'RELATED_TO', strength: 0.88, description: 'The Dibia is the healer who treats Ogbanje children', fingerprint: 'e_dibia_ogbanje' },
    { from: n['food_kola_nut'], to: n['language_igbo'], relationship: 'RELATED_TO', strength: 0.85, description: 'Kola nut ceremony is central to Igbo hospitality', fingerprint: 'e_kola_igbo' },
    { from: n['food_kola_nut'], to: n['language_yoruba'], relationship: 'RELATED_TO', strength: 0.8, description: 'Kola nut is also used in Yoruba ceremonies', fingerprint: 'e_kola_yoruba' },
    { from: n['moral_humility'], to: n['story_ijapa_yoruba'], relationship: 'SAME_MORAL', strength: 0.85, description: 'Ijapa\'s downfall teaches humility', fingerprint: 'e_humility_ijapa' },
    { from: n['location_lagos'], to: n['language_yoruba'], relationship: 'RELATED_TO', strength: 0.7, description: 'Lagos is in Yoruba territory but is pan-Nigerian', fingerprint: 'e_lagos_yoruba' },
  ]);
  console.log('Created knowledge graph edges');

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!');
  console.log('─────────────────────────────────────────');
  console.log('Demo accounts (password: Password123!):');
  console.log('  admin@memoryai.ng       → Admin');
  console.log('  amina@memoryai.ng       → Contributor');
  console.log('  judge@memoryai.ng       → Judge/Demo user');
  console.log('─────────────────────────────────────────');
  console.log(`  ${stories.length} stories  |  ${proverbs.length} proverbs  |  ${nodes.length} graph nodes`);
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
