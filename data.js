/**
 * data.js
 *
 * Fichier centralisé contenant toutes les données statiques du site.
 *
 * POURQUOI CE FICHIER EXISTE :
 * - Centralise toutes les données en un seul endroit
 * - Facilite la maintenance et l'ajout de contenu
 * - Préparation pour migration future vers Supabase
 * 
 * MIGRATION FUTURE VERS SUPABASE :
 * Ce fichier sera remplacé par des appels API à Supabase.
 * L'interface (GAMES, ARTICLES, FILTERS) restera identique,
 * seule la source de données changera (fichier statique → base de données).
 * 
 * COMMENT AJOUTER UN JEU :
 * 1. Ajouter un objet dans le tableau GAMES
 * 2. Respecter strictement la structure (tous les champs requis)
 * 3. Utiliser un id unique (slug, ex: "mon-nouveau-jeu")
 * 4. Tester que le jeu s'affiche correctement
 * 
 * COMMENT AJOUTER UN ARTICLE :
 * 1. Ajouter un objet dans le tableau ARTICLES
 * 2. Respecter la structure (id, title, excerpt, category, etc.)
 * 3. Lier à un jeu avec relatedGameId si pertinent (sinon null)
 * 4. Vérifier l'affichage sur les pages concernées
 */

// ============================================
// JEUX
// ============================================

window.GAMES = [
    {
        id: "neon-rift",
        title: "NEON RIFT",
        subtitle: "FPS nerveux en arène néon",
        description: "NEON RIFT vous transporte dans un monde dystopique où la technologie et la réalité se confondent. Ce FPS à la première personne vous place au cœur d'une métropole néon où chaque décision compte et chaque balle peut changer le cours de l'histoire.\n\nAvec son système de combat fluide et ses mécaniques de tir précises, NEON RIFT offre une expérience de jeu intense. Les graphismes à couper le souffle et l'ambiance sonore immersive créent une atmosphère unique qui vous tiendra en haleine du début à la fin.",
        releaseYear: 2026,
        studio: "Neon Studios",
        duration: "8–12h",
        difficulty: "Moyenne",
        modes: ["Solo", "Coop", "PvP"],
        platforms: ["PC"],
        genres: ["FPS"],
        isNew: true,
        image: "placeholder",
        createdAt: "2026-01-15T10:00:00Z"
    },
    {
        id: "mythfall",
        title: "MYTHFALL",
        subtitle: "Une épopée fantastique épique vous attend",
        description: "MYTHFALL est un RPG d'action immersif qui vous plonge dans un monde fantastique peuplé de créatures légendaires et de mystères anciens. Incarnez un héros destiné à sauver un royaume en péril dans cette aventure épique qui redéfinit le genre.\n\nAvec son système de combat dynamique et ses mécaniques de progression profondes, MYTHFALL offre des centaines d'heures de gameplay. Personnalisez votre personnage, forgez des alliances et découvrez des secrets cachés dans un monde ouvert vaste et détaillé.",
        releaseYear: 2026,
        studio: "Mythic Games",
        duration: "60–80h",
        difficulty: "Moyenne",
        modes: ["Solo", "Coop"],
        platforms: ["PS5"],
        genres: ["RPG"],
        isNew: true,
        image: "placeholder",
        createdAt: "2026-01-20T10:00:00Z"
    },
    {
        id: "iron-circuit",
        title: "IRON CIRCUIT",
        subtitle: "Course et combat dans un monde post-apocalyptique",
        description: "IRON CIRCUIT combine l'intensité des courses de véhicules avec l'action pure dans un univers post-apocalyptique unique. Personnalisez votre véhicule de combat et participez à des courses mortelles où la vitesse et la stratégie déterminent le vainqueur.\n\nAffrontez des adversaires redoutables dans des arènes destructibles, utilisez des armes montées sur véhicule et maîtrisez les techniques de conduite avancées pour survivre dans ce monde impitoyable.",
        releaseYear: 2026,
        studio: "Iron Forge Games",
        duration: "15–20h",
        difficulty: "Difficile",
        modes: ["Solo", "PvP"],
        platforms: ["Xbox"],
        genres: ["Action"],
        isNew: false,
        image: "placeholder",
        createdAt: "2026-01-10T10:00:00Z"
    },
    {
        id: "pocket-odyssey",
        title: "POCKET ODYSSEY",
        subtitle: "Aventure portable dans votre poche",
        description: "POCKET ODYSSEY est une aventure épique conçue pour la Nintendo Switch, offrant une expérience de jeu complète que vous pouvez emporter partout. Explorez un monde magique rempli de créatures adorables, de puzzles ingénieux et d'une histoire captivante.\n\nAvec ses graphismes colorés et son gameplay accessible, POCKET ODYSSEY convient à tous les âges. Collectez des objets, résolvez des énigmes et découvrez les secrets d'un royaume enchanté dans cette aventure inoubliable.",
        releaseYear: 2026,
        studio: "Pocket Studios",
        duration: "25–30h",
        difficulty: "Facile",
        modes: ["Solo"],
        platforms: ["Switch"],
        genres: ["Aventure"],
        isNew: false,
        image: "placeholder",
        createdAt: "2026-01-05T10:00:00Z"
    },
    {
        id: "ashlands",
        title: "ASHLANDS",
        subtitle: "Survie dans un monde hostile",
        description: "ASHLANDS vous plonge dans un environnement post-apocalyptique où chaque ressource compte. Survivez aux éléments, construisez votre base et affrontez des créatures mutantes dans ce jeu de survie exigeant.\n\nAvec son système de crafting approfondi et ses mécaniques de survie réalistes, ASHLANDS offre une expérience immersive où chaque décision peut être vitale. Explorez un vaste monde ouvert, découvrez des secrets et forgez votre propre destin dans ce monde impitoyable.",
        releaseYear: 2026,
        studio: "Survival Games Inc",
        duration: "40–60h",
        difficulty: "Difficile",
        modes: ["Solo", "Coop"],
        platforms: ["PC"],
        genres: ["Survival"],
        isNew: false,
        image: "placeholder",
        createdAt: "2026-01-08T10:00:00Z"
    },
    {
        id: "crimson-blade",
        title: "CRIMSON BLADE",
        subtitle: "Combat à l'épée dans un monde médiéval-fantastique",
        description: "CRIMSON BLADE est un jeu d'action-aventure qui vous transporte dans un royaume médiéval-fantastique rempli de dangers et de mystères. Maîtrisez l'art du combat à l'épée, explorez des donjons périlleux et affrontez des ennemis redoutables.\n\nAvec son système de combat fluide et ses combos élaborés, CRIMSON BLADE offre une expérience de jeu dynamique. Personnalisez votre style de combat, collectez des armes légendaires et devenez le héros que ce royaume attend.",
        releaseYear: 2026,
        studio: "Blade Studios",
        duration: "20–25h",
        difficulty: "Moyenne",
        modes: ["Solo"],
        platforms: ["PS5"],
        genres: ["Action"],
        isNew: false,
        image: "placeholder",
        createdAt: "2026-01-12T10:00:00Z"
    }
];

// ============================================
// ARTICLES
// ============================================

window.ARTICLES = [
    {
        id: "nouveau-jeu-aaa",
        title: "Nouveau jeu AAA sorti",
        excerpt: "Découvrez les dernières nouveautés gaming",
        category: "Actu",
        relatedGameId: null,
        createdAt: "2026-01-25T10:00:00Z"
    },
    {
        id: "guide-meilleurs-fps",
        title: "Guide des meilleurs FPS",
        excerpt: "Top 10 des jeux de tir à essayer",
        category: "Guide",
        relatedGameId: "neon-rift",
        createdAt: "2026-01-22T10:00:00Z"
    },
    {
        id: "actualites-esport",
        title: "Actualités eSport",
        excerpt: "Les dernières compétitions en cours",
        category: "Actu",
        relatedGameId: null,
        createdAt: "2026-01-20T10:00:00Z"
    },
    {
        id: "nouveau-fps-2026",
        title: "Nouveau FPS révolutionnaire",
        excerpt: "Découvrez le nouveau titre qui révolutionne le genre FPS",
        category: "Actu",
        relatedGameId: null,
        createdAt: "2026-01-08T10:00:00Z"
    },
    {
        id: "review-nouveau-rpg",
        title: "Review : Nouveau RPG",
        excerpt: "Notre avis sur le dernier RPG",
        category: "Test",
        relatedGameId: "mythfall",
        createdAt: "2026-01-18T10:00:00Z"
    },
    {
        id: "astuces-conseils",
        title: "Astuces et conseils",
        excerpt: "Améliorez votre gameplay",
        category: "Guide",
        relatedGameId: null,
        createdAt: "2026-01-15T10:00:00Z"
    },
    {
        id: "hardware-gaming",
        title: "Hardware gaming",
        excerpt: "Les meilleurs équipements 2026",
        category: "Hardware",
        relatedGameId: null,
        createdAt: "2026-01-10T10:00:00Z"
    },
    // Articles supplémentaires pour tester la pagination
    {
        id: "actualites-esport-2026",
        title: "eSport 2026 : Tendances à suivre",
        excerpt: "Les compétitions qui feront l'année",
        category: "Actu",
        relatedGameId: null,
        createdAt: "2025-12-30T10:00:00Z"
    },
    {
        id: "nouveau-patch-mythfall",
        title: "Patch majeur pour Mythfall",
        excerpt: "Toutes les nouveautés du dernier patch",
        category: "Actu",
        relatedGameId: "mythfall",
        createdAt: "2025-12-22T10:00:00Z"
    },
    {
        id: "lancement-ps6-rumeurs",
        title: "PS6 : Les rumeurs se précisent",
        excerpt: "Sony préparerait sa nouvelle console next-gen",
        category: "Actu",
        relatedGameId: null,
        createdAt: "2025-12-20T10:00:00Z"
    },
    {
        id: "nvidia-nouvelle-carte",
        title: "NVIDIA annonce une nouvelle carte graphique",
        excerpt: "La RTX 50-series arrive plus tôt que prévu",
        category: "Actu",
        relatedGameId: null,
        createdAt: "2025-12-18T10:00:00Z"
    },
    {
        id: "metaverse-gaming",
        title: "Le metaverse gaming prend son envol",
        excerpt: "Les jeux sociaux virtuels gagnent en popularité",
        category: "Actu",
        relatedGameId: null,
        createdAt: "2025-12-16T10:00:00Z"
    },
    {
        id: "cyberpunk-2077-update",
        title: "Cyberpunk 2077 : Mise à jour majeure",
        excerpt: "CD Projekt améliore enfin son titre phare",
        category: "Actu",
        relatedGameId: null,
        createdAt: "2025-12-14T10:00:00Z"
    },
    {
        id: "industrie-gaming-2026",
        title: "L'industrie du gaming en 2026",
        excerpt: "Les tendances qui marqueront l'année",
        category: "Actu",
        relatedGameId: null,
        createdAt: "2025-12-12T10:00:00Z"
    },
    {
        id: "nouveau-studio-independant",
        title: "Nouveau studio indépendant prometteur",
        excerpt: "Une équipe de passionnés rejoint la scène indie",
        category: "Actu",
        relatedGameId: null,
        createdAt: "2025-12-10T10:00:00Z"
    },
    {
        id: "concours-esport-majeur",
        title: "Concours eSport d'envergure mondiale",
        excerpt: "Le plus gros prize pool de l'histoire",
        category: "Actu",
        relatedGameId: null,
        createdAt: "2025-12-08T10:00:00Z"
    },
    {
        id: "technologie-ray-tracing",
        title: "Ray tracing : La révolution continue",
        excerpt: "Les progrès technologiques en matière de rendu",
        category: "Actu",
        relatedGameId: null,
        createdAt: "2025-12-06T10:00:00Z"
    },
    {
        id: "guide-survival",
        title: "Guide complet Survival",
        excerpt: "Tout savoir sur les mécaniques de survie",
        category: "Guide",
        relatedGameId: "ashlands",
        createdAt: "2026-01-06T10:00:00Z"
    },
    {
        id: "test-rpg-independant",
        title: "Test : RPG indépendant prometteur",
        excerpt: "Notre analyse détaillée de ce RPG indie",
        category: "Test",
        relatedGameId: null,
        createdAt: "2026-01-04T10:00:00Z"
    },
    {
        id: "bons-plans-noel",
        title: "Bons plans de Noël gaming",
        excerpt: "Les meilleures offres pour les fêtes",
        category: "Bons plans",
        relatedGameId: null,
        createdAt: "2026-01-02T10:00:00Z"
    },
    {
        id: "actualites-esport-2026",
        title: "eSport 2026 : Tendances à suivre",
        excerpt: "Les compétitions qui feront l'année",
        category: "Actu",
        relatedGameId: null,
        createdAt: "2025-12-30T10:00:00Z"
    },
    {
        id: "guide-optimisation-pc",
        title: "Guide optimisation PC gaming",
        excerpt: "Boostez les performances de votre setup",
        category: "Guide",
        relatedGameId: null,
        createdAt: "2025-12-28T10:00:00Z"
    },
    {
        id: "review-jeu-mobile",
        title: "Review : Jeu mobile gaming",
        excerpt: "Peut-on jouer sérieusement sur mobile ?",
        category: "Test",
        relatedGameId: null,
        createdAt: "2025-12-26T10:00:00Z"
    },
    {
        id: "promotions-hiver",
        title: "Promotions d'hiver gaming",
        excerpt: "Économisez sur vos achats gaming",
        category: "Bons plans",
        relatedGameId: null,
        createdAt: "2025-12-24T10:00:00Z"
    },
    {
        id: "nouveau-patch-mythfall",
        title: "Patch majeur pour Mythfall",
        excerpt: "Toutes les nouveautés du dernier patch",
        category: "Actu",
        relatedGameId: "mythfall",
        createdAt: "2025-12-22T10:00:00Z"
    },
    {
        id: "guide-neon-rift",
        title: "Guide complet Neon Rift",
        excerpt: "Maîtrisez tous les aspects du jeu",
        category: "Guide",
        relatedGameId: "neon-rift",
        createdAt: "2025-12-20T10:00:00Z"
    }
];

// ============================================
// FILTRES
// ============================================

window.FILTERS = {
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    genres: ["RPG", "Action", "FPS", "Aventure", "Survival", "Indé"],
    difficulties: ["Facile", "Moyenne", "Difficile"]
};

// ============================================
// ÉQUIPE
// ============================================

window.TEAM = {
    aboutTitle: "Équipe",
    aboutText: "Les admins et rédacteurs du site",
    members: [
        {
            id: "pingon-clement",
            name: "PINGON Clément",
            role: "directeur",
            tagline: "Créateur de contenu (YouTube/TikTok) • Directeur du site",
            bio: "Créateur de contenu gaming. Je présente des jeux, des tests et des actus, avec une approche accessible et divertissante.",
            order: 1,
            avatarType: "initials",
            avatarMediaId: "",
            avatarUrl: "",
            initials: "PC",
            links: {
                youtube: "https://www.youtube.com/@Lermitedunet",
                tiktok: "https://www.tiktok.com/@lermitedunet",
                twitch: "https://www.twitch.tv/lerm1tedunet",
                site: ""
            }
        },
        {
            id: "pingon-yanis",
            name: "PINGON Yanis",
            role: "createur",
            tagline: "Créateur de contenu (YouTube/TikTok) • Rédacteur",
            bio: "Rédacteur et créateur de contenu. J'écris sur les jeux du moment et je partage des recommandations.",
            order: 2,
            avatarType: "initials",
            avatarMediaId: "",
            avatarUrl: "",
            initials: "PY",
            links: {
                youtube: "",
                tiktok: "",
                twitch: "",
                site: ""
            }
        },
        {
            id: "atake-leo",
            name: "ATAKE Léo",
            role: "redacteur",
            tagline: "Rédacteur • Gamer",
            bio: "Rédacteur passionné, focus gameplay et ressenti joueur. Objectif : des articles clairs et utiles.",
            order: 3,
            avatarType: "initials",
            avatarMediaId: "",
            avatarUrl: "",
            initials: "AL",
            links: {
                youtube: "",
                tiktok: "",
                twitch: "",
                site: ""
            }
        }
    ]
};

// ============================================
// AUTEURS
// ============================================

window.AUTHORS = [
    {
        id: "clement",
        name: "PINGON Clément",
        role: "Directeur",
        bio: "Créateur de contenu gaming. Je présente des jeux, des tests et des actus, avec une approche accessible et divertissante.",
        socials: {
            youtube: "https://www.youtube.com/@Lermitedunet",
            tiktok: "https://www.tiktok.com/@lermitedunet",
            twitch: "https://www.twitch.tv/lerm1tedunet"
        }
    },
    {
        id: "yanis",
        name: "PINGON Yanis",
        role: "Rédacteur",
        bio: "Rédacteur et créateur de contenu. J'écris sur les jeux du moment et je partage des recommandations.",
        socials: {}
    },
    {
        id: "leo",
        name: "ATAKE Léo",
        role: "Rédacteur",
        bio: "Rédacteur passionné, focus gameplay et ressenti joueur. Objectif : des articles clairs et utiles.",
        socials: {}
    }
];

// Données exposées globalement via window.*

