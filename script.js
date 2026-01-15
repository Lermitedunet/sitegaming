// Gaming Hub - JavaScript
// Système de filtrage des jeux avec sélection multiple

console.log("[LMD] script.js version:", "2026-01-14-a");

// ============================================
// INPUT MODALITY DETECTOR - FIX HALO SPONSOR AU CLIC
// ============================================
(function initInputModality() {
  if (window.__INPUT_MODALITY_INIT__) return;
  window.__INPUT_MODALITY_INIT__ = true;

  const root = document.documentElement;
  const set = (v) => {
    root.dataset.input = v;
  };

  // défaut (si rien) => souris pour éviter ring au clic
  if (!root.dataset.input) set("mouse");

  window.addEventListener("pointerdown", () => set("mouse"), true);
  window.addEventListener("mousedown", () => set("mouse"), true);

  window.addEventListener(
    "keydown",
    (e) => {
      // ✅ guard absolu - vérification renforcée
      if (!e || !e.key || typeof e.key !== "string" || e.key.length === 0)
        return;

      // garder la logique existante (Tab / Arrow...)
      if (e.key === "Tab" || e.key.startsWith("Arrow")) {
        set("keyboard");
      }
    },
    true,
  );

  console.log("[LMD] InputModality patched");
})();

// ============================================
// GESTION DU STOCKAGE ADMIN (localStorage)
// ============================================

// Namespace centralisé pour les clés et données
window.LMD = window.LMD || {};
window.LMD.storageKeys = window.LMD.storageKeys || {
  games: "lmdl_games_v1",
  articles: "lermite_articles_override",
  tests: "lermite_tests_override",
  bonsplans: "lermite_bonsplans_override",
  promos: "lmd_promos",
  partners: "team_override",
  sponsors: "lmdl_sponsors_v1",
  media: "lermite_media",
  mediaFolders: "lermite_media_folders",
  team: "team_override",
  users: "lmdl_users",
  bugs: "lermite_bugs_log_v1",
  contactRequests: "admin_contact_requests_v1",
  conditions: "admin_conditions_page_v1",
  authUsers: "auth_users_v1",
  authSession: "auth_session_v1",
  authLog: "auth_log_v1",
};
// Toutes les clés de stockage sont centralisées dans window.LMD.storageKeys ci-dessus

// FIX FLASH FOOTER: Solution complète contre les jumps de scroll
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

// FIX FLASH FOOTER: Forcer scroll to top et prévenir les changements de position
window.scrollTo({ top: 0, left: 0, behavior: "auto" });

// FIX FLASH FOOTER: Verrouiller le scroll pendant le chargement initial
document.body.style.overflow = "hidden";
document.documentElement.style.overflow = "hidden";

// FIX FLASH FOOTER: Remettre le scroll après un court délai
setTimeout(() => {
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}, 100);

// FIX FLASH FOOTER: Supprimer tout autofocus potentiel
document.addEventListener("DOMContentLoaded", () => {
  const autofocusElements = document.querySelectorAll("[autofocus]");
  autofocusElements.forEach((el) => el.removeAttribute("autofocus"));
});

// Toutes les clés et données de base sont gérées via window.* et window.LMD
// FORCE RELOAD: 2026-01-14 12:45

/**
 * ADDED: Helper safe pour récupérer les données équipe avec fallbacks
 * @returns {Array|Object} - Données équipe (array ou object)
 */
function getBaseTeamSafe() {
  if (typeof window.BASE_TEAM !== "undefined" && Array.isArray(window.BASE_TEAM))
    return window.BASE_TEAM;
  if (Array.isArray(window.TEAM)) return window.TEAM;
  if (Array.isArray(window.AUTHORS)) return window.AUTHORS;
  return [];
}

/**
 * ADDED: Retourne la source de données équipe : localStorage si présent, sinon BASE_TEAM
 * @returns {Object} - Objet équipe avec aboutTitle, aboutText, members[]
 */
function getTeamData() {
  try {
    const raw = localStorage.getItem(window.LMD.storageKeys.team);
    if (raw) {
      const stored = JSON.parse(raw);
      // Migration depuis ancien format (array) vers nouveau format (object)
      if (Array.isArray(stored) && stored.length > 0) {
        // Migrer l'ancien format
        return migrateTeamFromArray(stored);
      } else if (
        stored &&
        typeof stored === "object" &&
        stored.members &&
        Array.isArray(stored.members)
      ) {
        // Nouveau format
        return normalizeTeamData(stored);
      }
    }
  } catch (e) {
    // Si localStorage corrompu, fallback sur BASE_TEAM
  }
  return normalizeTeamData(getBaseTeamSafe());
}

/**
 * ADDED: Migre depuis l'ancien format (array) vers le nouveau format (object)
 */
function migrateTeamFromArray(oldArray) {
  const members = oldArray
    .map((member, index) => {
      const sanitized = sanitizeTeamMember(member);
      if (!sanitized) return null;

      // Déterminer le rôle depuis l'ancien champ role/title
      let role = "redacteur";
      const roleText = (sanitized.role || "").toLowerCase();
      if (roleText.includes("directeur") || roleText.includes("director")) {
        role = "directeur";
      } else if (
        roleText.includes("créateur") ||
        roleText.includes("createur") ||
        roleText.includes("créateur")
      ) {
        role = "createur";
      }

      // Déterminer avatarType
      let avatarType = "initials";
      let avatarUrl = sanitized.avatarUrl || "";
      let avatarMediaId = "";
      if (
        avatarUrl &&
        avatarUrl.trim() &&
        (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://"))
      ) {
        avatarType = "url";
      } else {
        avatarType = "initials";
      }

      return {
        id: sanitized.id || `member-${index + 1}`,
        name: sanitized.name,
        role: role,
        tagline: sanitized.role || "",
        bio: sanitized.bio,
        order: index + 1,
        avatarType: avatarType,
        avatarMediaId: avatarMediaId,
        avatarUrl: avatarUrl,
        initials: getInitials(sanitized.name),
        links: {
          youtube: sanitized.links.youtube || "",
          tiktok: sanitized.links.tiktok || "",
          twitch: sanitized.links.twitch || "",
          site: sanitized.links.website || sanitized.links.site || "",
        },
      };
    })
    .filter((m) => m !== null);

  return {
    aboutTitle: "Équipe",
    aboutText: "Les admins et rédacteurs du site",
    members: members,
  };
}

/**
 * ADDED: Normalise les données équipe pour garantir la structure
 */
function normalizeTeamData(teamData) {
  if (!teamData || typeof teamData !== "object") {
    return {
      aboutTitle: "Équipe",
      aboutText: "Les admins et rédacteurs du site",
      members: [],
    };
  }

  return {
    aboutTitle: (teamData.aboutTitle || "Équipe").trim(),
    aboutText: (
      teamData.aboutText || "Les admins et rédacteurs du site"
    ).trim(),
    members: Array.isArray(teamData.members)
      ? teamData.members
          .map((m) => normalizeTeamMember(m))
          .filter((m) => m !== null)
      : [],
  };
}

/**
 * ADDED: Normalise un membre de l'équipe
 */
function normalizeTeamMember(member) {
  if (!member || typeof member !== "object") return null;

  const id = (member.id || "").trim() || "member-" + Date.now();
  const name = (member.name || "").trim();
  if (!name) return null;

  const role =
    member.role === "directeur" ||
    member.role === "createur" ||
    member.role === "redacteur"
      ? member.role
      : "redacteur";

  const order =
    typeof member.order === "number" && member.order >= 1 ? member.order : 999;

  // ADDED: Support avatarType "image" pour avatars avec recadrage
  const avatarType =
    member.avatarType === "media" ||
    member.avatarType === "url" ||
    member.avatarType === "image" ||
    member.avatarType === "initials"
      ? member.avatarType
      : "initials";

  // ADDED: Générer slug si absent
  let memberSlug = (member.slug || "").trim();
  if (!memberSlug) {
    memberSlug = slugify(name);
  }

  // ADDED: isActive (default true si absent)
  const isActive =
    member.isActive !== undefined ? Boolean(member.isActive) : true;

  // ADDED: avatarText (initiales par défaut)
  const avatarText = (member.avatarText || getInitials(name))
    .trim()
    .substring(0, 3)
    .toUpperCase();

  return {
    id: id,
    slug: memberSlug,
    name: name,
    role: role,
    tagline: (member.tagline || member.title || "").trim(), // Support title pour compat
    bio: (member.bio || "").trim(),
    order: order,
    avatarType: avatarType,
    avatarMediaId: (member.avatarMediaId || "").trim(),
    avatarUrl: (member.avatarUrl || "").trim(),
    avatarCrop:
      member.avatarCrop && typeof member.avatarCrop === "object"
        ? {
            x:
              typeof member.avatarCrop.x === "number" ? member.avatarCrop.x : 0,
            y:
              typeof member.avatarCrop.y === "number" ? member.avatarCrop.y : 0,
            scale:
              typeof member.avatarCrop.scale === "number" &&
              member.avatarCrop.scale >= 1
                ? member.avatarCrop.scale
                : 1,
          }
        : { x: 0, y: 0, scale: 1 }, // ADDED: Crop pour avatars image
    initials: (member.initials || avatarText)
      .trim()
      .substring(0, 3)
      .toUpperCase(),
    avatarText: avatarText,
    isActive: isActive,
    links: {
      youtube: ((member.links || {}).youtube || "").trim(),
      tiktok: ((member.links || {}).tiktok || "").trim(),
      twitch: ((member.links || {}).twitch || "").trim(),
      site: (
        (member.links || {}).site ||
        (member.links || {}).website ||
        ""
      ).trim(),
    },
  };
}

/**
 * ADDED: Sauvegarde l'équipe dans localStorage
 * @param {Object} teamData - Objet équipe avec aboutTitle, aboutText, members[]
 */
function saveTeamData(teamData) {
  try {
    const normalized = normalizeTeamData(teamData);
    localStorage.setItem(
      window.LMD.storageKeys.team,
      JSON.stringify(normalized),
    );
    console.log(
      "[team] saved team data",
      normalized.members?.length || 0,
      "members",
    );
  } catch (e) {
    console.error("[team] Erreur lors de la sauvegarde de l'équipe:", e);
  }
}

/**
 * ADDED: Helper pour normaliser un nom (lowercase + remove accents + trim + collapse spaces)
 */
function normalizeName(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer accents
    .trim()
    .replace(/\s+/g, " "); // Collapse spaces
}

/**
 * ADDED: Normalise un nom de personne pour le matching (alias de normalizeName pour clarté)
 */
function normalizePersonName(str) {
  return normalizeName(str);
}

/**
 * ADDED: Retourne les articles d'un auteur par son nom (matching robuste)
 * @param {string} authorName - Nom de l'auteur (ex: "PINGON Clément")
 * @returns {Array} - Liste des articles de cet auteur
 */
function getArticlesByAuthorName(authorName) {
  if (!authorName || typeof authorName !== "string") return [];

  const normalizedAuthorName = normalizePersonName(authorName);
  if (!normalizedAuthorName) return [];

  // IMPORTANT: Utiliser getArticlesData() comme source de vérité unique
  const articles = getArticlesData();

  return articles.filter((article) => {
    // Matcher par authorName ou author (texte)
    const articleAuthor = toText(
      article.authorName || article.author || "",
    ).trim();
    if (!articleAuthor) return false;

    // Comparaison normalisée (insensible à la casse, sans accents)
    const normalizedArticleAuthor = normalizePersonName(articleAuthor);
    return normalizedArticleAuthor === normalizedAuthorName;
  });
}

/**
 * ADDED: Garantit l'unicité d'un slug pour les membres
 * @param {Array} members - Liste des membres
 * @param {string} desiredSlug - Slug désiré
 * @param {string} currentId - ID du membre actuel (pour exclure du conflit)
 * @returns {string} - Slug unique
 */
function ensureUniqueMemberSlug(members, desiredSlug, currentId) {
  try {
    const base = slugify(desiredSlug || "");
    if (!base) return "";

    if (!Array.isArray(members)) return base;

    let candidate = base;
    let counter = 2;

    while (
      members.some((m) => {
        const normalized = normalizeTeamMember(m);
        return (
          normalized &&
          normalized.slug === candidate &&
          normalized.id !== currentId
        );
      })
    ) {
      candidate = `${base}-${counter}`;
      counter++;
    }

    return candidate;
  } catch (e) {
    return slugify(desiredSlug || "");
  }
}

/**
 * ADDED: Retourne la liste des membres de l'équipe (pour SELECT auteur)
 * @returns {Array} - Tableau de membres avec id, name, roleLine
 */
function getTeamMembers() {
  const teamData = getTeamData();
  const members =
    teamData && Array.isArray(teamData.members) ? teamData.members : [];

  // Si aucun membre dans localStorage, retourner les membres par défaut
  if (members.length === 0) {
    return [
      {
        id: "clement",
        name: "PINGON Clément",
        roleLine: "Créateur de contenu (YouTube/TikTok) • Directeur du site",
        bio: "",
        role: "directeur",
      },
      {
        id: "yanis",
        name: "PINGON Yanis",
        roleLine: "Créateur de contenu (YouTube/TikTok) • Rédacteur",
        bio: "",
        role: "redacteur",
      },
      {
        id: "leo",
        name: "ATAKE Léo",
        roleLine: "Rédacteur • Gamer",
        bio: "",
        role: "redacteur",
      },
    ];
  }

  // Retourner les membres normalisés
  return members
    .map((m) => {
      const normalized = normalizeTeamMember(m);
      if (!normalized) return null;
      return {
        id: normalized.id,
        name: normalized.name,
        roleLine: normalized.tagline || "",
        bio: normalized.bio || "",
        role: normalized.role || "redacteur",
      };
    })
    .filter((m) => m !== null);
}

/**
 * ADDED: Retourne la liste des auteurs (source unique)
 * @returns {Array} - Liste des auteurs
 */
/**
 * ADDED: Retourne la liste des auteurs (source unique : window.AUTHORS)
 * @returns {Array} - Liste des auteurs
 */
function getAuthors() {
  try {
    // Source unique : window.AUTHORS
    if (window.AUTHORS && Array.isArray(window.AUTHORS)) {
      return window.AUTHORS;
    }
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * ADDED: Récupère un auteur par son ID
 * @param {string} authorId - ID de l'auteur
 * @returns {Object|null} - Auteur ou null si non trouvé
 */
function getAuthorById(authorId) {
  if (!authorId) return null;
  try {
    const authors = getAuthors();
    return authors.find((a) => a.id === authorId) || null;
  } catch (e) {
    return null;
  }
}

/**
 * ADDED: Normalise un nom d'auteur (texte) vers un ID auteur si possible
 * @param {string} value - Nom d'auteur (texte libre ou ID)
 * @returns {string|null} - ID auteur normalisé ou null
 */
function normalizeAuthorId(value) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const trimmedLower = trimmed.toLowerCase();

  try {
    // Si value == "clement"/"yanis"/"leo" => return tel quel
    if (
      trimmedLower === "clement" ||
      trimmedLower === "yanis" ||
      trimmedLower === "leo"
    ) {
      return trimmedLower;
    }

    // Mapping spécifique selon les noms
    const lower = trimmedLower;
    if (
      lower.includes("clément") ||
      lower.includes("clement") ||
      lower.includes("pingon clément") ||
      lower.includes("pingon clement")
    ) {
      return "clement";
    }
    if (lower.includes("yanis") || lower.includes("pingon yanis")) {
      return "yanis";
    }
    if (
      lower.includes("léo") ||
      lower.includes("leo") ||
      lower.includes("atake léo") ||
      lower.includes("atake leo")
    ) {
      return "leo";
    }

    // Fallback : chercher dans getAuthors() par nom
    const authors = getAuthors();
    const byName = authors.find((a) => {
      const nameLower = (a.name || "").toLowerCase();
      return (
        nameLower === trimmedLower ||
        nameLower.includes(trimmedLower) ||
        trimmedLower.includes(nameLower)
      );
    });
    if (byName) return byName.id;

    return null;
  } catch (e) {
    return null;
  }
}

/**
 * ADDED: Retourne le label d'auteur pour un article (utilisé dans les affichages)
 * @param {Object} article - Article
 * @returns {string} - Nom de l'auteur ou "—"
 */
function getAuthorLabel(article) {
  if (!article) return "—";

  try {
    // Priorité 1 : si article.authorId => name depuis getAuthorById
    const authorId = toText(article.authorId || "");
    if (authorId) {
      const author = getAuthorById(authorId);
      if (author && author.name) {
        return author.name;
      }
    }

    // Priorité 2 : sinon si article.author (texte) => retourner article.author (mais tenter normalize + resolve si possible)
    const authorText = toText(article.author || article.authorName || "");
    if (authorText) {
      // Tenter normalize + resolve
      const normalizedId = normalizeAuthorId(authorText);
      if (normalizedId) {
        const author = getAuthorById(normalizedId);
        if (author && author.name) {
          return author.name;
        }
      }
      // Si pas de correspondance, retourner le texte tel quel
      return authorText;
    }

    return "—";
  } catch (e) {
    // Fallback silencieux
    return toText(article.author || article.authorName || "—");
  }
}

/**
 * ADDED: Récupère un média par son ID
 * @param {string} mediaId - ID du média
 * @returns {Object|null} - Média ou null si non trouvé
 */
function getMediaById(mediaId) {
  if (!mediaId || typeof mediaId !== "string" || !mediaId.trim()) {
    return null;
  }

  const mediaList = getMediaData();
  return mediaList.find((m) => toText(m.id) === toText(mediaId)) || null;
}

/**
 * ADDED: Helper pour normaliser un membre de l'équipe (compatibilité ancien format)
 * @param {Object} member - Membre de l'équipe
 * @returns {Object} - Membre normalisé (ancien format)
 */
function sanitizeTeamMember(member) {
  if (!member || typeof member !== "object") {
    return null;
  }

  // Générer un ID si absent
  let id = member.id;
  if (!id || typeof id !== "string" || !id.trim()) {
    const name = (member.name || "").trim();
    if (name) {
      id = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    } else {
      id = "member-" + Date.now();
    }
  }

  return {
    id: id.trim(),
    name: (member.name || "").trim(),
    role: (member.role || member.title || "").trim(),
    bio: (member.bio || "").trim(),
    avatarUrl: (member.avatarUrl || member.photo || "").trim(),
    links: {
      youtube: ((member.links || member.socials || {}).youtube || "").trim(),
      tiktok: ((member.links || member.socials || {}).tiktok || "").trim(),
      twitch: ((member.links || member.socials || {}).twitch || "").trim(),
      website: (
        (member.links || member.socials || {}).website ||
        (member.links || member.socials || {}).site ||
        ""
      ).trim(),
    },
  };
}

// ADDED: État de navigation dans l'onglet Médias
let currentMediaFolder = null; // null = vue dossiers, sinon nom dossier

// Clé localStorage pour les favoris

// Toutes les clés sont centralisées dans window.LMD.storageKeys

/**
 * Retourne la source de données : localStorage si présent, sinon window.BASE_GAMES
 * @returns {Array} - Tableau des jeux
 */
function getGamesSource() {
  const raw = localStorage.getItem(window.LMD.storageKeys.games);
  if (raw) {
    try {
      const stored = JSON.parse(raw);
      if (Array.isArray(stored) && stored.length > 0) {
        return stored;
      }
    } catch (e) {
      console.warn("Erreur lors de la lecture depuis localStorage:", e);
    }
  }
  return window.BASE_GAMES || [];
}

/**
 * Écrit les jeux dans localStorage
 * @param {Array} games - Tableau des jeux à sauvegarder
 */
function saveGamesToStorage(games) {
  try {
    localStorage.setItem(window.LMD.storageKeys.games, JSON.stringify(games));
  } catch (e) {
    console.error("Erreur lors de la sauvegarde dans localStorage:", e);
    throw new Error("Impossible de sauvegarder les jeux");
  }
}

/**
 * ADDED: Récupère les promos depuis localStorage (ou tableau vide)
 * @returns {Array} - Tableau des promos
 */
function getPromosData() {
  const raw = localStorage.getItem(window.LMD.storageKeys.promos);
  if (raw) {
    try {
      const stored = JSON.parse(raw);
      // ADDED: Migration : si c'est un objet unique (pas array), convertir en array
      if (Array.isArray(stored)) {
        return stored;
      } else if (stored && typeof stored === "object" && stored.id) {
        // C'est un objet unique, le convertir en array
        const migrated = [stored];
        savePromosData(migrated);
        return migrated;
      }
    } catch (e) {
      console.warn(
        "Erreur lors de la lecture des promos depuis localStorage:",
        e,
      );
    }
  }
  return [];
}

/**
 * ADDED: Sauvegarde les promos dans localStorage
 * @param {Array} promos - Tableau des promos à sauvegarder
 */
function savePromosData(promos) {
  try {
    localStorage.setItem(window.LMD.storageKeys.promos, JSON.stringify(promos));
  } catch (e) {
    console.error("Erreur lors de la sauvegarde des promos:", e);
  }
}

/**
 * Charge les jeux depuis localStorage si présent, sinon depuis window.BASE_GAMES
 * @returns {Array} - Tableau des jeux
 */
function loadGames() {
  return getGamesSource();
}

// Variable globale pour stocker les jeux chargés
let loadedGames = loadGames();

// ============================================
// BASE DE DONNÉES DES JEUX (legacy, sera supprimée)
// ============================================

const GAMES_DB = {
  "neon-rift": {
    title: "NEON RIFT",
    consoles: ["pc"],
    genres: ["fps"],
    tagline: "FPS nerveux en arène néon",
    description:
      "NEON RIFT vous transporte dans un monde dystopique où la technologie et la réalité se confondent. Ce FPS à la première personne vous place au cœur d'une métropole néon où chaque décision compte et chaque balle peut changer le cours de l'histoire.\n\nAvec son système de combat fluide et ses mécaniques de tir précises, NEON RIFT offre une expérience de jeu intense. Les graphismes à couper le souffle et l'ambiance sonore immersive créent une atmosphère unique qui vous tiendra en haleine du début à la fin.",
    gameplay:
      "Plongez dans des combats rapides et intenses avec un arsenal d'armes futuristes. Maîtrisez les mouvements fluides, les sauts boostés et les capacités spéciales pour dominer vos adversaires dans des arènes multijoueur compétitives.",
    features: ["Solo", "Coop", "PvP"],
    studio: "Neon Studios",
    release: "2026",
    duration: "8–12h",
    difficulty: "Moyenne",
    imageGradient: "blue",
    articles: [
      {
        title: "Guide des meilleurs FPS",
        href: "articles/guide-meilleurs-fps.html",
        tag: "Guide",
      },
      {
        title: "Nouveau jeu AAA sorti",
        href: "articles/nouveau-jeu-aaa.html",
        tag: "Actu",
      },
    ],
  },
  mythfall: {
    title: "MYTHFALL",
    consoles: ["ps5"],
    genres: ["rpg"],
    tagline: "Une épopée fantastique épique vous attend",
    description:
      "MYTHFALL est un RPG d'action immersif qui vous plonge dans un monde fantastique peuplé de créatures légendaires et de mystères anciens. Incarnez un héros destiné à sauver un royaume en péril dans cette aventure épique qui redéfinit le genre.\n\nAvec son système de combat dynamique et ses mécaniques de progression profondes, MYTHFALL offre des centaines d'heures de gameplay. Personnalisez votre personnage, forgez des alliances et découvrez des secrets cachés dans un monde ouvert vaste et détaillé.",
    gameplay:
      "Explorez un vaste monde ouvert rempli de quêtes, de donjons et de secrets. Développez votre personnage avec un système de compétences profond, forgez des armes légendaires et affrontez des boss épiques dans des combats tactiques.",
    features: ["Solo", "Coop"],
    studio: "Mythic Games",
    release: "2026",
    duration: "60–80h",
    difficulty: "Variable",
    imageGradient: "purple",
    articles: [
      {
        title: "Nouveau jeu AAA sorti",
        href: "articles/nouveau-jeu-aaa.html",
        tag: "Actu",
      },
    ],
  },
  "iron-circuit": {
    title: "IRON CIRCUIT",
    consoles: ["xbox"],
    genres: ["action"],
    tagline: "Course et combat dans un monde post-apocalyptique",
    description:
      "IRON CIRCUIT combine l'intensité des courses de véhicules avec l'action pure dans un univers post-apocalyptique unique. Personnalisez votre véhicule de combat et participez à des courses mortelles où la vitesse et la stratégie déterminent le vainqueur.\n\nAffrontez des adversaires redoutables dans des arènes destructibles, utilisez des armes montées sur véhicule et maîtrisez les techniques de conduite avancées pour survivre dans ce monde impitoyable.",
    gameplay:
      "Pilotez des véhicules de combat personnalisables dans des courses intenses. Utilisez des armes montées, des boosters et des capacités spéciales pour éliminer vos adversaires tout en restant en tête de la course.",
    features: ["Solo", "PvP"],
    studio: "Iron Forge Games",
    release: "2026",
    duration: "15–20h",
    difficulty: "Élevée",
    imageGradient: "orange",
    articles: [],
  },
  "pocket-odyssey": {
    title: "POCKET ODYSSEY",
    consoles: ["switch"],
    genres: ["aventure"],
    tagline: "Aventure portable dans votre poche",
    description:
      "POCKET ODYSSEY est une aventure épique conçue pour la Nintendo Switch, offrant une expérience de jeu complète que vous pouvez emporter partout. Explorez un monde magique rempli de créatures adorables, de puzzles ingénieux et d'une histoire captivante.\n\nAvec ses graphismes colorés et son gameplay accessible, POCKET ODYSSEY convient à tous les âges. Collectez des objets, résolvez des énigmes et découvrez les secrets d'un royaume enchanté dans cette aventure inoubliable.",
    gameplay:
      "Explorez un monde ouvert rempli de secrets et de défis. Résolvez des puzzles environnementaux, interagissez avec des personnages mémorables et collectez des objets rares pour progresser dans votre quête épique.",
    features: ["Solo"],
    studio: "Pocket Studios",
    release: "2026",
    duration: "25–30h",
    difficulty: "Facile",
    imageGradient: "green",
    articles: [
      {
        title: "Nouveau jeu AAA sorti",
        href: "articles/nouveau-jeu-aaa.html",
        tag: "Actu",
      },
    ],
  },
};

// État des filtres
let selectedConsoles = [];
let selectedGenres = [];
let searchText = "";

// Sélection des éléments DOM
const filterChips = document.querySelectorAll(".chip[data-filter]");
let gameCards = document.querySelectorAll(".game-card");
const searchInput = document.getElementById("search-input");
const resetButton = document.getElementById("reset-filters");
const resultsCount = document.getElementById("results-count");

// ============================================
// FONCTION DE FILTRAGE DES JEUX
// ============================================

/**
 * Filtre les jeux selon les critères sélectionnés
 * @param {Array} games - Tableau des jeux à filtrer (par défaut: getGamesData())
 * @returns {Array} - Tableau des jeux filtrés
 */
function filterGames(games = null) {
  // ADDED: Utiliser getGamesData() si games n'est pas fourni (pas d'accès direct à loadedGames)
  if (!games) {
    games = getGamesData();
  }

  // PATCH: Vérifier que games est un array avant d'utiliser filter
  if (!Array.isArray(games)) {
    return [];
  }

  // PATCH: Sécuriser les variables globales utilisées dans le filtrage
  const safeSelectedConsoles = Array.isArray(selectedConsoles)
    ? selectedConsoles
    : [];
  const safeSelectedGenres = Array.isArray(selectedGenres)
    ? selectedGenres
    : [];
  const safeSearchText = typeof searchText === "string" ? searchText : "";

  return games.filter((game) => {
    // PATCH: Normaliser les propriétés du jeu pour éviter les erreurs "undefined"
    const safePlatforms = Array.isArray(game.platforms) ? game.platforms : [];
    const safeGenres = Array.isArray(game.genres) ? game.genres : [];
    const safeTitle = typeof game.title === "string" ? game.title : "";

    // Vérifier les consoles
    // Si aucune console sélectionnée, on accepte tous les jeux
    let consoleMatch = true;
    if (safeSelectedConsoles.length > 0) {
      // Convertir les plateformes du jeu en minuscules pour comparaison
      const gamePlatforms = safePlatforms.map((p) => p.toLowerCase());
      // Le jeu doit avoir AU MOINS une plateforme dans selectedConsoles
      consoleMatch = gamePlatforms.some((platform) =>
        safeSelectedConsoles.includes(platform.toLowerCase()),
      );
    }

    // Vérifier les genres
    // Si aucun genre sélectionné, on accepte tous les jeux
    let genreMatch = true;
    if (safeSelectedGenres.length > 0) {
      // Convertir les genres du jeu en minuscules pour comparaison
      const gameGenres = safeGenres.map((g) => g.toLowerCase());
      // Le jeu doit avoir AU MOINS un genre dans selectedGenres
      genreMatch = gameGenres.some((genre) =>
        safeSelectedGenres.includes(genre.toLowerCase()),
      );
    }

    // Vérifier la recherche par nom
    let searchMatch = true;
    if (safeSearchText.trim() !== "") {
      const gameTitle = safeTitle.toLowerCase();
      searchMatch = gameTitle.includes(safeSearchText.toLowerCase());
    }

    // Le jeu est affiché si tous les critères sont remplis
    return consoleMatch && genreMatch && searchMatch;
  });
}

/**
 * Applique les filtres et réaffiche les jeux
 */
function applyFilters() {
  // PATCH: Guard général - vérifier que les éléments nécessaires existent sur la page
  const gamesGrid =
    document.getElementById("gamesGrid") ||
    document.getElementById("games-grid");
  if (!gamesGrid) {
    return; // Pas de grille de jeux sur cette page, rien à faire
  }

  // PATCH: Sécuriser les variables globales contre undefined
  const safeSelectedConsoles = Array.isArray(selectedConsoles)
    ? selectedConsoles
    : [];
  const safeSelectedGenres = Array.isArray(selectedGenres)
    ? selectedGenres
    : [];
  const safeSearchText = typeof searchText === "string" ? searchText : "";

  // PATCH: Sécuriser getGamesData() contre undefined
  const gamesData = getGamesData();
  const safeGamesData = Array.isArray(gamesData) ? gamesData : [];

  // ADDED: Filtrer les jeux depuis getGamesData() (pas d'accès direct à loadedGames)
  const filteredGames = filterGames(safeGamesData);

  // Réafficher la grille avec les jeux filtrés (avec pagination)
  if (gamesGrid) {
    renderGames(filteredGames, gamesGrid.id, {
      enablePagination: true,
      resetPage: true, // Reset à page 1 quand les filtres changent
    });
  }

  // Mettre à jour le compteur de résultats
  const resultsCount = document.getElementById("results-count");
  if (resultsCount) {
    const totalGames = safeGamesData.length;
    if (
      filteredGames.length === totalGames &&
      safeSelectedConsoles.length === 0 &&
      safeSelectedGenres.length === 0 &&
      safeSearchText === ""
    ) {
      resultsCount.textContent = ""; // Masquer si aucun filtre n'est appliqué
    } else {
      resultsCount.textContent = `${filteredGames.length} jeu${filteredGames.length > 1 ? "x" : ""} affiché${filteredGames.length > 1 ? "s" : ""}`;
    }
  }
}

// Gestion du clic sur les chips de filtre
// Gestion des clics sur les chips de filtres
filterChips.forEach((chip) => {
  chip.addEventListener("click", function () {
    const filterType = this.getAttribute("data-filter");
    const filterValue = this.getAttribute("data-value").toLowerCase();

    // PATCH: Sécuriser les variables avant utilisation
    if (!Array.isArray(selectedConsoles)) selectedConsoles = [];
    if (!Array.isArray(selectedGenres)) selectedGenres = [];

    if (filterType === "console") {
      // Toggle dans le tableau des consoles
      const index = selectedConsoles.indexOf(filterValue);
      if (index > -1) {
        // Retirer si déjà présent
        selectedConsoles.splice(index, 1);
        this.classList.remove("active");
      } else {
        // Ajouter si absent
        selectedConsoles.push(filterValue);
        this.classList.add("active");
      }
    } else if (filterType === "genre") {
      // Toggle dans le tableau des genres
      const index = selectedGenres.indexOf(filterValue);
      if (index > -1) {
        // Retirer si déjà présent
        selectedGenres.splice(index, 1);
        this.classList.remove("active");
      } else {
        // Ajouter si absent
        selectedGenres.push(filterValue);
        this.classList.add("active");
      }
    }

    // Appliquer les filtres (qui appelle renderGames avec les jeux filtrés)
    applyFilters();
  });
});

// Gestion de la recherche
if (searchInput) {
  searchInput.addEventListener("input", function () {
    searchText = this.value.trim();
    applyFilters(); // Appliquer les filtres (qui appelle renderGames avec les jeux filtrés)
  });
}

// Gestion du bouton Réinitialiser
if (resetButton) {
  resetButton.addEventListener("click", function () {
    // Vider les tableaux de filtres
    selectedConsoles = [];
    selectedGenres = [];
    searchText = "";

    // Réinitialiser l'input de recherche
    if (searchInput) {
      searchInput.value = "";
    }

    // Retirer toutes les classes "active" des chips
    filterChips.forEach((chip) => {
      chip.classList.remove("active");
    });

    // Réinitialiser le tri
    currentSort = "default";
    if (sortSelect) {
      sortSelect.value = "default";
    }
    saveSort("default");

    // ADDED: Réafficher TOUS les jeux depuis getGamesData() (pas d'accès direct à loadedGames)
    const gamesGrid =
      document.getElementById("gamesGrid") ||
      document.getElementById("games-grid");
    if (gamesGrid) {
      renderGames(getGamesData(), gamesGrid.id, {
        enablePagination: true,
        resetPage: true, // Reset à page 1
      });
    }

    // Mettre à jour le compteur
    if (resultsCount) {
      resultsCount.textContent = "";
    }
  });
}

// Initialisation : appliquer les filtres au chargement (au cas où)
applyFilters();

// ============================================
// SYSTÈME DE TRI DES JEUX
// ============================================

const RECENT_KEY = "lmdl_recent";
const SORT_KEY = "lmdl_sort";

// État du tri
let currentSort = "default";

// Fonction pour récupérer les jeux récemment consultés
function getRecentGames() {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.warn("Erreur lors de la lecture des jeux récents:", e);
    return {};
  }
}

// Fonction pour sauvegarder un jeu comme récemment consulté
function markGameAsRecent(gameId) {
  if (!gameId) return;
  try {
    const recent = getRecentGames();
    recent[gameId] = Date.now();
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch (e) {
    console.warn("Erreur lors de la sauvegarde du jeu récent:", e);
  }
}

// Fonction pour récupérer le tri sauvegardé
function getSavedSort() {
  try {
    return localStorage.getItem(SORT_KEY) || "default";
  } catch (e) {
    return "default";
  }
}

// Fonction pour sauvegarder le tri
function saveSort(sortValue) {
  try {
    localStorage.setItem(SORT_KEY, sortValue);
  } catch (e) {
    console.warn("Erreur lors de la sauvegarde du tri:", e);
  }
}

// Fonction pour appliquer le tri et les filtres
function applySortAndFilters() {
  const gamesGrid =
    document.getElementById("gamesGrid") ||
    document.getElementById("games-grid");
  if (!gamesGrid) {
    // Pas de grille de jeux sur cette page, on ne fait rien
    return;
  }

  // PATCH: Sécuriser les variables globales
  const safeSelectedConsoles = Array.isArray(selectedConsoles)
    ? selectedConsoles
    : [];
  const safeSelectedGenres = Array.isArray(selectedGenres)
    ? selectedGenres
    : [];
  const safeSearchText = typeof searchText === "string" ? searchText : "";

  // PATCH: Sécuriser getGamesData() contre undefined
  const gamesData = getGamesData();
  const safeGamesData = Array.isArray(gamesData) ? gamesData : [];

  // ADDED: Filtrer les jeux depuis getGamesData() (pas d'accès direct à loadedGames)
  let filteredGames = filterGames(safeGamesData);

  // Appliquer le tri selon currentSort
  switch (currentSort) {
    case "az":
      filteredGames.sort((a, b) => {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return titleA.localeCompare(titleB, "fr");
      });
      break;

    case "za":
      filteredGames.sort((a, b) => {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return titleB.localeCompare(titleA, "fr");
      });
      break;

    case "recent":
      const recent = getRecentGames();
      filteredGames.sort((a, b) => {
        const timeA = recent[a.id] || 0;
        const timeB = recent[b.id] || 0;

        if (timeB !== timeA) {
          return timeB - timeA; // Plus récent en premier
        }
        // Si même timestamp (ou aucun), garder l'ordre alphabétique
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return titleA.localeCompare(titleB, "fr");
      });
      break;

    case "default":
    default:
      // Pas de tri, garder l'ordre de GAMES
      break;
  }

  // Réafficher les jeux filtrés et triés (avec pagination)
  renderGames(filteredGames, gamesGrid.id, {
    enablePagination: true,
    resetPage: true, // Reset à page 1 quand tri change
  });

  // Mettre à jour le compteur de résultats
  const resultsCount = document.getElementById("results-count");
  if (resultsCount) {
    const totalGames = safeGamesData.length;
    if (
      filteredGames.length === totalGames &&
      safeSelectedConsoles.length === 0 &&
      safeSelectedGenres.length === 0 &&
      safeSearchText === ""
    ) {
      resultsCount.textContent = ""; // Masquer si aucun filtre n'est appliqué
    } else {
      resultsCount.textContent = `${filteredGames.length} jeu${filteredGames.length > 1 ? "x" : ""} affiché${filteredGames.length > 1 ? "s" : ""}`;
    }
  }
}

// Gestion du select de tri
const sortSelect = document.getElementById("sort-select");
if (sortSelect) {
  // Restaurer le tri sauvegardé au chargement
  const savedSort = getSavedSort();
  currentSort = savedSort;
  sortSelect.value = savedSort;

  // Écouter les changements
  sortSelect.addEventListener("change", function () {
    currentSort = this.value;
    saveSort(currentSort);
    applySortAndFilters();
  });
}

// Tracker les clics sur les cartes pour enregistrer les jeux récemment consultés
document.addEventListener(
  "click",
  function (e) {
    const gameLink = e.target.closest(".game-link");
    if (gameLink) {
      const gameCard = gameLink.closest(".game-card");
      if (gameCard) {
        const gameId = gameCard.dataset.gameId;
        if (gameId) {
          markGameAsRecent(gameId);
        }
      }
    }
  },
  true,
);

// Appliquer le tri au chargement
// PATCH: Guard pour éviter les initialisations catalogue sur login.html et signup.html
const __page = (location.pathname.split("/").pop() || "").toLowerCase();
const __isAuthPage = __page === "login.html" || __page === "signup.html";

if (!__isAuthPage) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(applySortAndFilters, 100); // Petit délai pour s'assurer que les filtres sont appliqués
      renderHomePromos(); // ADDED: Afficher les promos sur la page principale
      // NOTE: Auth UI maintenant gérée centralement par initAuthRoutingAndUI
    });
  } else {
    setTimeout(applySortAndFilters, 100);
    renderHomePromos(); // ADDED: Afficher les promos sur la page principale
    // NOTE: Auth UI maintenant gérée centralement par initAuthRoutingAndUI
  }
} else {
  // NOTE: Auth UI maintenant gérée centralement par initAuthRoutingAndUI
}

// ============================================

// Pagination helper générique pour les grilles
function initGridPagination({
  gridEl,
  pagerEl,
  items,
  pageSize = 12,
  renderItem,
  onPageChange,
  key = "page",
  resetPage = false,
}) {
  if (!gridEl || !items.length) return;

  const totalPages = Math.ceil(items.length / pageSize);
  let currentPage = 1;

  // Récupérer la page depuis l'URL si présente (sauf si reset demandé)
  if (!resetPage) {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPage = parseInt(
      urlParams.get("p") || urlParams.get("page") || "1",
    );
    if (urlPage >= 1 && urlPage <= totalPages) {
      currentPage = urlPage;
    }
  }

  // Créer le conteneur pagination si absent
  if (!pagerEl) {
    pagerEl = document.createElement("div");
    pagerEl.className = "pagination";
    gridEl.parentNode.insertBefore(pagerEl, gridEl.nextSibling);
  }

  // Fonction pour rendre une page
  function renderPage(page) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = items.slice(start, end);

    // Sauvegarder la position de scroll avant rerender
    const scrollY = window.scrollY;

    // Rendre les items
    gridEl.innerHTML = pageItems.map(renderItem).join("");

    // Restaurer la position de scroll après rerender (évite le saut)
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: "auto" });
    });

    // Scroll optionnel vers le haut du grid (désactivé par défaut pour éviter les sauts)
    if (onPageChange === true) {
      setTimeout(() => {
        const top = gridEl.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top, behavior: "smooth" });
      }, 150);
    }
  }

  // Fonction pour rendre les boutons pagination
  function renderPagination() {
    if (totalPages <= 1) {
      pagerEl.style.display = "none";
      return;
    }

    pagerEl.style.display = "flex";
    pagerEl.innerHTML = "";

    // Bouton Précédent
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn pagination-nav";
    prevBtn.textContent = "‹";
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => changePage(currentPage - 1));
    pagerEl.appendChild(prevBtn);

    // Pages numérotées (simplifié : montrer max 7 pages)
    const maxVisible = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Première page si nécessaire
    if (startPage > 1) {
      const firstBtn = document.createElement("button");
      firstBtn.className = "pagination-btn";
      firstBtn.textContent = "1";
      firstBtn.addEventListener("click", () => changePage(1));
      pagerEl.appendChild(firstBtn);

      if (startPage > 2) {
        const dots = document.createElement("span");
        dots.className = "pagination-dots";
        dots.textContent = "…";
        pagerEl.appendChild(dots);
      }
    }

    // Pages visibles
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `pagination-btn${i === currentPage ? " active" : ""}`;
      pageBtn.textContent = i.toString();
      pageBtn.addEventListener("click", () => changePage(i));
      pagerEl.appendChild(pageBtn);
    }

    // Dernière page si nécessaire
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const dots = document.createElement("span");
        dots.className = "pagination-dots";
        dots.textContent = "…";
        pagerEl.appendChild(dots);
      }

      const lastBtn = document.createElement("button");
      lastBtn.className = "pagination-btn";
      lastBtn.textContent = totalPages.toString();
      lastBtn.addEventListener("click", () => changePage(totalPages));
      pagerEl.appendChild(lastBtn);
    }

    // Bouton Suivant
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn pagination-nav";
    nextBtn.textContent = "›";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => changePage(currentPage + 1));
    pagerEl.appendChild(nextBtn);
  }

  // Fonction pour changer de page
  function changePage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;

    currentPage = page;

    // Mettre à jour l'URL (optionnel, sans reload)
    const newUrl = new URL(window.location);
    newUrl.searchParams.set("p", page.toString());
    window.history.replaceState(null, "", newUrl);

    renderPage(currentPage);
    renderPagination();

    if (onPageChange) onPageChange(currentPage);
  }

  // Rendu initial
  renderPage(currentPage);
  renderPagination();

  // Exposer la fonction de changement de page pour usage externe (reset, etc.)
  return {
    changePage,
    getCurrentPage: () => currentPage,
    getTotalPages: () => totalPages,
  };
}

// Fonction pour appliquer la pagination à un container déjà rendu
function applyPaginationToContainer(
  containerId,
  items,
  renderItemFn,
  pageSize = 12,
) {
  const container = document.getElementById(containerId);
  if (!container || !items.length) return;

  // Utiliser initGridPagination avec les éléments déjà traités
  const pagerEl = container.nextElementSibling;
  if (!pagerEl || !pagerEl.classList.contains("pagination")) {
    const newPagerEl = document.createElement("div");
    newPagerEl.className = "pagination";
    container.parentNode.insertBefore(newPagerEl, container.nextSibling);
  }

  return initGridPagination({
    gridEl: container,
    pagerEl: container.nextElementSibling,
    items: items,
    pageSize: pageSize,
    renderItem: renderItemFn,
    key: `container-${containerId}`,
  });
}

/**
 * ADDED: Gestionnaire de soumission du formulaire test
 */
function handleTestFormSubmit(e) {
  e.preventDefault();

  // Synchroniser les blocs depuis le DOM avant de lire le formulaire
  syncTestBlocksFromDOM();

  const formData = new FormData(e.target);

  try {
    const test = normalizeTestPayload(formData);
    const isEdit = !!test.id;

    if (upsertTest(test)) {
      closeTestModal();
      renderAdminTestsList();

      // ADDED: Mise à jour des compteurs admin
      updateAdminSiteCounters();

      console.log(`Test ${isEdit ? "modifié" : "ajouté"} avec succès:`, test);
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du test:", error);
    showTestFormErrors({ title: error.message });
  }
}

/**
 * ADDED: Rend la page des tests (mosaïque premium)
 */
function renderTestsPage() {
  const container = document.getElementById("testsGrid");
  if (!container) return;

  const tests = getTestsData();

  // Rendre les tests
  if (tests.length > 0) {
    container.innerHTML = tests.map(test => renderTestItem(test)).join("");
    // Appliquer fallbacks aux images après rendu
    applyImageFallbacks(container);
  } else {

  // Fonction pour rendre un test individuel (même structure que les articles)
  function renderTestItem(test) {
    const game = test.gameId
      ? getGamesData().find((g) => g.id === test.gameId)
      : null;
    const gameName = game ? game.title : test.gameTitle || "Jeu inconnu";
    const scoreText = test.score ? `${test.score.toFixed(1)}/10` : "N/A";
    const platforms =
      Array.isArray(test.platforms) && test.platforms.length > 0
        ? test.platforms.join(", ")
        : "Toutes plateformes";

    // Image de couverture (comme les articles) avec badge de score superposé
    const imageHtml =
      test.coverUrl && test.coverUrl.trim()
        ? `<div class="article-image" style="background-image: url('${escapeHtml(test.coverUrl)}');"><span class="test-score-badge">${scoreText}</span></div>`
        : `<div class="article-image placeholder-image"><span class="test-score-badge">${scoreText}</span></div>`;

    // Métas formatés
    const metaText = `${escapeHtml(gameName)} • ${platforms}`;
    const dateText = test.publishedAt
      ? ` • ${new Date(test.publishedAt).toLocaleDateString("fr-FR")}`
      : "";

    // Générer le lien vers la page détail du test
    const testUrl = test.slug
      ? `test.html?slug=${encodeURIComponent(test.slug)}`
      : `test.html?id=${encodeURIComponent(test.id)}`;

    return `
            <article class="article-card">
                <a href="${testUrl}">
                    ${imageHtml}
                    <div class="article-content">
                        <h3 class="article-title">${escapeHtml(test.title || "Sans titre")}</h3>
                        <p class="article-excerpt">${escapeHtml(test.excerpt || "Découvrez notre test complet...")}</p>
                        <div class="article-meta">${metaText}${dateText}</div>
                    </div>
                </a>
            </article>
        `;
  }

  // Wrapper premium pour la grille
  ensurePremiumPanel(container, {});

  // Utiliser la pagination comme pour les jeux
  if (tests.length > 0) {
    // Trouver ou créer le conteneur pagination
    let pagerEl = container.nextElementSibling;
    if (!pagerEl || !pagerEl.classList.contains("pagination")) {
      pagerEl = document.createElement("div");
      pagerEl.className = "pagination";
      container.parentNode.insertBefore(pagerEl, container.nextSibling);
    }

    const pagination = initGridPagination({
      gridEl: container,
      pagerEl: pagerEl,
      items: tests,
      pageSize: 12,
      renderItem: renderTestItem,
      key: "tests",
    });

    // Appliquer fallbacks aux images après rendu initial
    setTimeout(() => applyImageFallbacks(container), 100);

    return pagination;
  } else {
    // Aucun test : afficher le message vide
    container.innerHTML = `
            <div class="articles-empty">
                <p>Aucun test disponible pour le moment.</p>
            </div>
        `;
  }
}

// ============================================
// TESTS - Variables globales et helpers
// ============================================

let testBlocks = [];

// ============================================
// DEBUG SYSTEM - Diagnostic overlay avec audit et seed
// ============================================

// État global du debug
window.debugState = {
  logs: [],
  errors: [],
  seeded: {},
  auditResults: null,
};


/**
 * Met à jour le panneau debug admin
 */
function updateDebugPanel() {
  if (!isDebug()) return;

  let panel = document.getElementById("admin-debug-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "admin-debug-panel";
    panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 500px;
            background: rgba(0, 0, 0, 0.95);
            color: #fff;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            border: 1px solid #333;
            border-radius: 8px;
            z-index: 10000;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

    // Header avec contrôles
    const header = document.createElement("div");
    header.style.cssText = `
            background: #1a1a1a;
            padding: 8px 12px;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
    header.innerHTML = `
            <span>🔧 DEBUG PANEL</span>
            <div style="display: flex; gap: 5px;">
                <button onclick="exportDebugReport()" style="background: #4ade80; color: black; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;">📄 Export</button>
                <button onclick="toggleDebugPanel()" style="background: #fbbf24; color: black; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;">−</button>
            </div>
        `;

    // Content
    const content = document.createElement("div");
    content.id = "debug-panel-content";
    content.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 8px 12px;
            max-height: 450px;
        `;

    panel.appendChild(header);
    panel.appendChild(content);
    document.body.appendChild(panel);
  }

  const content = panel.querySelector("#debug-panel-content");
  if (content) {
    const { logs, errors, seeded, auditResults } = window.debugState;

    let html = "";

    // Compteurs
    html += `<div style="margin-bottom: 8px; padding: 4px; background: #1a1a1a; border-radius: 4px;">
            <strong>📊 Counters:</strong> Logs: ${logs.length} | Errors: ${errors.length} | Seeded: ${Object.keys(seeded).length} types
        </div>`;

    // Résultats du seed récent
    if (Object.keys(seeded).length > 0) {
      html +=
        '<div style="margin-bottom: 8px;"><strong>🧪 Recent Seed:</strong></div>';
      Object.entries(seeded).forEach(([type, count]) => {
        html += `<div style="margin-left: 10px;">${type}: +${count}</div>`;
      });
    }

    // Résultats d'audit
    if (auditResults) {
      html +=
        '<div style="margin-bottom: 8px;"><strong>🔍 Audit Results:</strong></div>';
      Object.entries(auditResults).forEach(([category, issues]) => {
        if (issues.length > 0) {
          html += `<div style="margin-left: 10px; color: #ef4444;">${category}: ${issues.length} issues</div>`;
        }
      });
    }

    // Logs récents (max 10)
    if (logs.length > 0) {
      html +=
        '<div style="margin-bottom: 8px;"><strong>📝 Recent Logs:</strong></div>';
      logs.slice(-10).forEach((log) => {
        const color =
          log.level === "error"
            ? "#ef4444"
            : log.level === "warn"
              ? "#fbbf24"
              : "#4ade80";
        html += `<div style="margin-left: 10px; color: ${color}; font-size: 10px;">[${log.timestamp}] ${log.scope}: ${log.data.substring(0, 100)}${log.data.length > 100 ? "..." : ""}</div>`;
      });
    }

    content.innerHTML = html;
  }
}

// Fonction renderArticleContent() obsolète supprimée

/**
 * Bascule la visibilité du panneau debug
 */
function toggleDebugPanel() {
  const panel = document.getElementById("admin-debug-panel");
  if (panel) {
    panel.style.display = panel.style.display === "none" ? "flex" : "none";
  }
}

/**
 * Export du rapport debug
 */
function exportDebugReport() {
  const { logs, errors, seeded, auditResults } = window.debugState;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalLogs: logs.length,
      totalErrors: errors.length,
      seededTypes: Object.keys(seeded).length,
      auditCategories: auditResults ? Object.keys(auditResults).length : 0,
    },
    seeded,
    auditResults,
    recentLogs: logs.slice(-20),
    recentErrors: errors.slice(-10),
  };

  // Copier dans le presse-papiers
  navigator.clipboard
    .writeText(JSON.stringify(report, null, 2))
    .then(() => {
      debugLog("DEBUG", "Report copied to clipboard");
    })
    .catch((err) => {
      debugLog("DEBUG", "Failed to copy report: " + err.message, "error");
    });

  // Aussi créer un download
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `debug-report-${new Date().toISOString().substring(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * ADDED: Exporte toutes les données admin (localStorage)
 */
function exportAdminData() {
  const data = {};

  // Liste des clés localStorage utilisées par l'admin
  const adminKeys = [
    window.LMD?.storageKeys?.games || 'games',
    window.LMD?.storageKeys?.articles || 'articles',
    window.LMD?.storageKeys?.tests || 'tests',
    window.LMD?.storageKeys?.bonsPlans || 'bonsPlans',
    window.LMD?.storageKeys?.promos || 'promos',
    window.LMD?.storageKeys?.sponsors || 'sponsors',
    window.LMD?.storageKeys?.media || 'media',
    window.LMD?.storageKeys?.team || 'team',
    window.LMD?.storageKeys?.mediaFolders || 'mediaFolders'
  ];

  // Collecter toutes les données
  adminKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        data[key] = JSON.parse(value);
      }
    } catch (e) {
      console.warn(`Erreur lors de la lecture de ${key}:`, e);
    }
  });

  // Ajouter métadonnées
  data._export = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    source: 'admin-export'
  };

  // Créer et télécharger le fichier
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `admin-data-${new Date().toISOString().substring(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  debugLog("ADMIN", "Données exportées avec succès");
}

/**
 * ADDED: Importe des données admin depuis un fichier JSON
 */
function importAdminData(jsonData) {
  try {
    const data = JSON.parse(jsonData);

    // Vérifier que c'est un export valide
    if (!data._export || data._export.source !== 'admin-export') {
      throw new Error('Fichier non valide - doit être un export admin');
    }

    let importedCount = 0;

    // Importer chaque clé (sauf les métadonnées)
    Object.keys(data).forEach(key => {
      if (key !== '_export') {
        try {
          localStorage.setItem(key, JSON.stringify(data[key]));
          importedCount++;
          debugLog("ADMIN", `Importé: ${key}`);
        } catch (e) {
          console.error(`Erreur lors de l'import de ${key}:`, e);
        }
      }
    });

    // Recharger la page pour appliquer les changements
    alert(`Import terminé ! ${importedCount} collections importées. La page va se recharger.`);
    window.location.reload();

  } catch (e) {
    alert(`Erreur lors de l'import: ${e.message}`);
    console.error('Import error:', e);
  }
}

/**
 * Capture globale des erreurs
 */
function setupErrorCapturing() {
  // Erreurs JavaScript
  window.addEventListener("error", (event) => {
    debugLog(
      "ERROR",
      `JS Error: ${event.message} at ${event.filename}:${event.lineno}`,
      "error",
    );
  });

  // Erreurs de promesses
  window.addEventListener("unhandledrejection", (event) => {
    debugLog("ERROR", `Unhandled Promise: ${event.reason}`, "error");
  });

  // Erreurs d'images dans les listes admin
  document.addEventListener(
    "error",
    (event) => {
      if (
        event.target.tagName === "IMG" &&
        event.target.closest(".admin-list, .admin-item")
      ) {
        debugLog("ERROR", `Image failed to load: ${event.target.src}`, "error");
      }
    },
    true,
  );
}

// ============================================
// ADMIN TEST SYSTEM - Test manuel guidé
// ============================================

// État du mode test
let isTestModeActive = false;
let currentTestStep = 0;

// Étapes du test
const TEST_STEPS = [
  {
    id: "games",
    title: "Créer des jeux (20 jeux)",
    description:
      'Ajoutez 20 jeux réels via l\'onglet "Jeux". Utilisez les templates pour faciliter la saisie.',
    targetCount: 20,
    contentType: "games",
    templates: [
      {
        title: "The Legend of Zelda: Tears of the Kingdom",
        description:
          "Suite de Breath of the Wild avec de nouvelles mécaniques et un monde ouvert immense.",
        image:
          "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063780/9989957eae3a6b545194c42fec207aad5b2cc1043c8e4a4a6a646e47544b7b0fc",
        platforms: ["Switch"],
        genres: ["Action", "Aventure"],
        rating: 4.8,
      },
      {
        title: "Baldur's Gate 3",
        description:
          "RPG tactique basé sur D&D avec un système de combat au tour par tour révolutionnaire.",
        image:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg",
        platforms: ["PC", "PS5", "Xbox Series X"],
        genres: ["RPG"],
        rating: 4.9,
      },
    ],
  },
  {
    id: "articles-actu",
    title: "Créer des articles Actu (13 articles)",
    description:
      'Ajoutez 13 articles dans la catégorie "Actu" via l\'onglet "Articles".',
    targetCount: 13,
    contentType: "articles",
    category: "actu",
    templates: [
      {
        title: "PlayStation Showcase 2024 : Les annonces majeures",
        excerpt:
          "Sony dévoile ses prochains hits avec Spider-Man 3, God of War Ragnarök Valhalla et bien d'autres surprises.",
        cover:
          "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202309/2702/52f0f5c0343b72b4bd6f5c6c3a2bb5c8a2e6b8c6.png",
        category: "actu",
      },
    ],
  },
  {
    id: "articles-guides",
    title: "Créer des guides (13 guides)",
    description:
      'Ajoutez 13 guides via l\'onglet "Articles" avec catégorie "Guide".',
    targetCount: 13,
    contentType: "articles",
    category: "guide",
    templates: [
      {
        title: "Guide complet Zelda : Tears of the Kingdom",
        excerpt:
          "Maîtrisez toutes les mécaniques et explorez chaque recoin du royaume d'Hyrule.",
        cover:
          "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063780/9989957eae3a6b545194c42fec207aad5b2cc1043c8e4a4a6a646e47544b7b0fc",
        category: "guide",
      },
    ],
  },
  {
    id: "tests",
    title: "Créer des tests (13 tests)",
    description:
      'Ajoutez 13 tests via l\'onglet "Tests". Liez chaque test à un jeu existant.',
    targetCount: 13,
    contentType: "tests",
    templates: [
      {
        title: "Test complet Zelda : Tears of the Kingdom",
        excerpt:
          "Une suite exceptionnelle qui élève encore plus haut la barre de l'open-world.",
        content:
          "Zelda : Tears of the Kingdom est tout simplement exceptionnel...",
        coverUrl:
          "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063780/9989957eae3a6b545194c42fec207aad5b2cc1043c8e4a4a6a646e47544b7b0fc",
        score: 9.5,
        criteria: [
          { label: "Gameplay", score: 9.8 },
          { label: "Direction artistique", score: 9.7 },
          { label: "Durée de vie", score: 9.6 },
          { label: "Innovation", score: 10 },
          { label: "Narration", score: 8.5 },
        ],
      },
    ],
  },
  {
    id: "bons-plans",
    title: "Créer des bons plans (13 offres)",
    description: 'Ajoutez 13 bons plans via l\'onglet "Bons plans".',
    targetCount: 13,
    contentType: "bonsPlans",
    templates: [
      {
        title: "God of War Ragnarök -60% sur Steam",
        excerpt:
          "Profitez de la meilleure réduction actuelle sur le jeu de l'année 2022.",
        coverUrl:
          "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0.png",
        externalUrl:
          "https://store.steampowered.com/app/2344520/God_of_War_Ragnark/",
        merchant: "Steam",
        price: 39.99,
        oldPrice: 99.99,
        discountPercent: 60,
      },
    ],
  },
];

/**
 * Active/désactive le mode test admin
 */
function toggleAdminTestMode() {
  const testPanel = document.getElementById("admin-test-panel");
  const btn = document.getElementById("btn-admin-test-mode");

  if (!testPanel || !btn) return;

  isTestModeActive = !isTestModeActive;

  if (isTestModeActive) {
    testPanel.style.display = "block";
    btn.textContent = "❌ Quitter le mode test";
    btn.style.background = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
    currentTestStep = 0;
    initializeTestChecklist();
    updateTestNavigation();
    logTestAction("Mode test activé - Checklist initialisée");
  } else {
    testPanel.style.display = "none";
    btn.textContent = "🧪 Mode Test Admin (manuel)";
    btn.style.background = "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)";
    logTestAction("Mode test désactivé");
  }
}

/**
 * Initialise la checklist des tests
 */
function initializeTestChecklist() {
  const checklistEl = document.getElementById("test-checklist");
  if (!checklistEl) return;

  checklistEl.innerHTML = TEST_STEPS.map((step, index) => {
    const currentCount = getCurrentCount(step);
    const isCompleted = currentCount >= step.targetCount;
    const isCurrent = index === currentTestStep;

    return `
            <div class="test-step ${isCurrent ? "current" : ""} ${isCompleted ? "completed" : ""}" data-step="${index}">
                <div class="test-step-header">
                    <div class="test-step-status">
                        ${isCompleted ? "✅" : isCurrent ? "🎯" : "⏳"}
                    </div>
                    <div class="test-step-title">${step.title}</div>
                    <div class="test-step-count">${currentCount}/${step.targetCount}</div>
                </div>
                <div class="test-step-description">${step.description}</div>
                ${
                  isCurrent
                    ? `<div class="test-step-actions">
                    <button class="btn btn-sm btn-secondary" onclick="showTestTemplates(${index})">📋 Voir templates</button>
                    <button class="btn btn-sm btn-primary" onclick="runStepVerification(${index})">🔍 Vérifier</button>
                </div>`
                    : ""
                }
            </div>
        `;
  }).join("");
}

/**
 * Affiche les templates pour une étape
 */
function showTestTemplates(stepIndex) {
  const step = TEST_STEPS[stepIndex];
  if (!step || !step.templates) return;

  const templatesHtml = step.templates
    .map(
      (template, index) => `
        <div class="template-item">
            <h4>Template ${index + 1}: ${template.title}</h4>
            <button class="btn btn-sm btn-info" onclick="copyTemplateToForm('${step.contentType}', ${JSON.stringify(template).replace(/"/g, "&quot;")})">
                📋 Copier dans formulaire
            </button>
        </div>
    `,
    )
    .join("");

  const modal = document.createElement("div");
  modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

  modal.innerHTML = `
        <div style="background: var(--color-bg-primary); padding: var(--spacing-xl); border-radius: var(--radius-lg); max-width: 600px; max-height: 80vh; overflow-y: auto;">
            <h3>Templates pour ${step.title}</h3>
            <div style="margin: var(--spacing-lg) 0;">${templatesHtml}</div>
            <button class="btn btn-secondary" onclick="this.closest('[style*=\"position: fixed\"]').remove()">Fermer</button>
        </div>
    `;

  document.body.appendChild(modal);
}

/**
 * Copie un template dans le formulaire approprié
 */
function copyTemplateToForm(contentType, template) {
  try {
    const data =
      typeof template === "string"
        ? JSON.parse(template.replace(/&quot;/g, '"'))
        : template;

    switch (contentType) {
      case "games":
        copyGameTemplate(data);
        break;
      case "articles":
        copyArticleTemplate(data);
        break;
      case "tests":
        copyTestTemplate(data);
        break;
      case "bonsPlans":
        copyBonPlanTemplate(data);
        break;
    }

    logTestAction(
      `Template copié pour ${contentType}: ${data.title || data.name}`,
    );
  } catch (error) {
    logTestAction(`Erreur copie template: ${error.message}`, "error");
  }
}

/**
 * Copie template jeu
 */
function copyGameTemplate(template) {
  // Ouvrir le modal jeu et pré-remplir
  const addBtn = document.querySelector(
    '#btn-add-game, [data-admin-tab="games"] + .admin-content-section .admin-actions .btn',
  );
  if (addBtn) {
    addBtn.click();
    // Attendre que le modal s'ouvre, puis remplir
    setTimeout(() => {
      document.getElementById("game-title").value = template.title || "";
      document.getElementById("game-description").value =
        template.description || "";
      document.getElementById("game-image").value = template.image || "";
      document.getElementById("game-rating").value = template.rating || "";
      // TODO: gérer plateformes et genres
    }, 100);
  }
}

/**
 * Copie template article
 */
function copyArticleTemplate(template) {
  const addBtn = document.querySelector("#btn-add-article");
  if (addBtn) {
    addBtn.click();
    setTimeout(() => {
      document.getElementById("article-title").value = template.title || "";
      document.getElementById("article-excerpt").value = template.excerpt || "";
      document.getElementById("article-cover").value = template.cover || "";
      document.getElementById("article-category").value =
        template.category || "";
    }, 100);
  }
}

/**
 * Copie template test
 */
function copyTestTemplate(template) {
  const addBtn = document.querySelector("#btn-add-test");
  if (addBtn) {
    addBtn.click();
    setTimeout(() => {
      document.getElementById("test-title").value = template.title || "";
      document.getElementById("test-excerpt").value = template.excerpt || "";
      document.getElementById("test-cover").value = template.coverUrl || "";
      document.getElementById("test-publishedAt").value =
        template.publishedAt || "";
      // TODO: gérer critères
    }, 100);
  }
}

/**
 * Copie template bon plan
 */
function copyBonPlanTemplate(template) {
  const addBtn = document.querySelector("#btn-add-bon-plan");
  if (addBtn) {
    addBtn.click();
    setTimeout(() => {
      document.getElementById("bon-plan-title").value = template.title || "";
      document.getElementById("bon-plan-excerpt").value =
        template.excerpt || "";
      document.getElementById("bon-plan-cover").value = template.coverUrl || "";
      document.getElementById("bon-plan-external-url").value =
        template.externalUrl || "";
      document.getElementById("bon-plan-merchant").value =
        template.merchant || "";
      document.getElementById("bon-plan-price").value = template.price || "";
      document.getElementById("bon-plan-old-price").value =
        template.oldPrice || "";
      document.getElementById("bon-plan-discount").value =
        template.discountPercent || "";
    }, 100);
  }
}

/**
 * Obtient le nombre actuel d'items pour une étape
 */
function getCurrentCount(step) {
  try {
    switch (step.contentType) {
      case "games":
        return getGamesData().length;
      case "articles":
        return getArticlesData().filter((a) => a.category === step.category)
          .length;
      case "tests":
        return getTestsData().length;
      case "bonsPlans":
        return getBonsPlansData().length;
      default:
        return 0;
    }
  } catch (error) {
    return 0;
  }
}

/**
 * Vérifie une étape
 */
function runStepVerification(stepIndex) {
  const step = TEST_STEPS[stepIndex];
  if (!step) return;

  logTestAction(`Vérification étape: ${step.title}`);

  const currentCount = getCurrentCount(step);
  const isCompleted = currentCount >= step.targetCount;

  // Vérifications supplémentaires selon le type
  let additionalChecks = [];

  try {
    switch (step.contentType) {
      case "games":
        additionalChecks = verifyGamesData();
        break;
      case "articles":
        additionalChecks = verifyArticlesData(step.category);
        break;
      case "tests":
        additionalChecks = verifyTestsData();
        break;
      case "bonsPlans":
        additionalChecks = verifyBonsPlansData();
        break;
    }
  } catch (error) {
    additionalChecks.push(`Erreur vérification: ${error.message}`);
  }

  if (isCompleted) {
    logTestAction(
      `✅ Étape terminée: ${currentCount}/${step.targetCount} items créés`,
      "success",
    );
    if (additionalChecks.length === 0) {
      logTestAction("✅ Toutes les vérifications passées", "success");
    }
  } else {
    logTestAction(
      `⏳ Étape en cours: ${currentCount}/${step.targetCount} items créés`,
      "info",
    );
  }

  additionalChecks.forEach((check) =>
    logTestAction(check, check.includes("❌") ? "error" : "info"),
  );

  initializeTestChecklist(); // Refresh l'affichage
}

/**
 * Vérifications pour les jeux
 */
function verifyGamesData() {
  const issues = [];
  const games = getGamesData();

  games.forEach((game) => {
    if (!game.image || !game.image.startsWith("http")) {
      issues.push(`❌ Jeu "${game.title}": image manquante ou invalide`);
    }
    if (!game.platforms || game.platforms.length === 0) {
      issues.push(`❌ Jeu "${game.title}": plateformes manquantes`);
    }
  });

  return issues;
}

/**
 * Vérifications pour les articles
 */
function verifyArticlesData(category) {
  const issues = [];
  const articles = getArticlesData().filter((a) => a.category === category);

  articles.forEach((article) => {
    if (!article.cover || !article.cover.startsWith("http")) {
      issues.push(`❌ Article "${article.title}": cover manquante`);
    }
    if (!article.slug) {
      issues.push(`❌ Article "${article.title}": slug manquant`);
    }
  });

  return issues;
}

/**
 * Vérifications pour les tests
 */
function verifyTestsData() {
  const issues = [];
  const tests = getTestsData();
  const games = getGamesData();

  tests.forEach((test) => {
    if (!test.gameId) {
      issues.push(`❌ Test "${test.title}": pas lié à un jeu`);
    } else {
      const game = games.find((g) => g.id === test.gameId);
      if (!game) {
        issues.push(
          `❌ Test "${test.title}": jeu référencé inexistant (${test.gameId})`,
        );
      } else if (test.platforms && test.platforms.length > 0) {
        // Vérifier cohérence plateformes
        const testPlatforms = test.platforms;
        const gamePlatforms = game.platforms || [];
        const hasCommonPlatform = testPlatforms.some((p) =>
          gamePlatforms.includes(p),
        );
        if (!hasCommonPlatform && gamePlatforms.length > 0) {
          issues.push(
            `⚠️ Test "${test.title}": plateformes incohérentes avec le jeu`,
          );
        }
      }
    }
  });

  return issues;
}

/**
 * Vérifications pour les bons plans
 */
function verifyBonsPlansData() {
  const issues = [];
  const bonsPlans = getBonsPlansData();

  bonsPlans.forEach((bonPlan) => {
    if (!bonPlan.externalUrl || !bonPlan.externalUrl.startsWith("http")) {
      issues.push(`❌ Bon plan "${bonPlan.title}": URL externe invalide`);
    }
    if (!bonPlan.coverUrl || !bonPlan.coverUrl.startsWith("http")) {
      issues.push(`❌ Bon plan "${bonPlan.title}": cover manquante`);
    }
  });

  return issues;
}

/**
 * Met à jour la navigation des étapes
 */
function updateTestNavigation() {
  const prevBtn = document.getElementById("btn-test-prev");
  const nextBtn = document.getElementById("btn-test-next");

  if (prevBtn) {
    prevBtn.disabled = currentTestStep === 0;
  }

  if (nextBtn) {
    const step = TEST_STEPS[currentTestStep];
    const currentCount = step ? getCurrentCount(step) : 0;
    const targetCount = step ? step.targetCount : 0;
    nextBtn.disabled = currentCount < targetCount;
    nextBtn.textContent =
      currentTestStep === TEST_STEPS.length - 1 ? "Terminer" : "Étape suivante";
  }
}

/**
 * Navigation étape précédente
 */
function goToPrevTestStep() {
  if (currentTestStep > 0) {
    currentTestStep--;
    initializeTestChecklist();
    updateTestNavigation();
    logTestAction(`Navigation: Étape ${currentTestStep + 1}`);
  }
}

/**
 * Navigation étape suivante
 */
function goToNextTestStep() {
  if (currentTestStep < TEST_STEPS.length - 1) {
    currentTestStep++;
    initializeTestChecklist();
    updateTestNavigation();
    logTestAction(`Navigation: Étape ${currentTestStep + 1}`);
  } else {
    // Test terminé
    logTestAction(
      "🎉 Test admin terminé ! Toutes les étapes validées.",
      "success",
    );
    toggleAdminTestMode();
  }
}

/**
 * Log une action de test
 */
function logTestAction(message, level = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${message}\n`;

  console.log(`ADMIN_TEST: ${message}`);

  // Ajouter au textarea
  const logTextarea = document.getElementById("test-log");
  if (logTextarea) {
    logTextarea.value += logEntry;
    logTextarea.scrollTop = logTextarea.scrollHeight;
  }
}

// ============================================
// DEMO INJECTION SYSTEM - Injection directe de contenu réaliste
// ============================================

// Mapping game -> Steam AppID pour images stables
const STEAM_APP_IDS = {
  "baldurs-gate-3": "1086940",
  "elden-ring": "1245620",
  "cyberpunk-2077": "1091500",
  "god-of-war-ragnarok": "2344520",
  "spider-man-2": "1817070",
  "helldivers-2": "553850",
  "alan-wake-2": "1667320",
  "red-dead-redemption-2": "1174180",
  "the-witcher-3": "292030",
  hades: "1145360",
  "hollow-knight": "367520",
  "diablo-iv": "2344520",
  "hogwarts-legacy": "990080",
  starfield: "1716740",
  "gta-v": "271590",
  "among-us": "945360",
  fortnite: "0", // Pas sur Steam
  "rocket-league": "252950",
  "stardew-valley": "413150",
};

// Fonction helper pour obtenir une image Steam stable
function getStableImage(gameId, fallbackUrl) {
  const appId = STEAM_APP_IDS[gameId];
  if (appId && appId !== "0") {
    return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
  }
  return (
    fallbackUrl ||
    "https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg"
  ); // GTA V fallback
}

/**
 * Applique le fallback aux images cassées dans un conteneur
 */
function attachImageFallback(root = document) {
  const images = root.querySelectorAll("img");
  images.forEach((img) => {
    if (img.hasAttribute("data-fallback-attached")) return;

    img.setAttribute("data-fallback-attached", "true");
    img.onerror = function () {
      if (!this.classList.contains("img-fallback")) {
        this.classList.add("img-fallback");
        this.src =
          "data:image/svg+xml;base64," +
          btoa(`
                    <svg width="200" height="120" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#667eea"/>
                                <stop offset="100%" style="stop-color:#764ba2"/>
                            </linearGradient>
                        </defs>
                        <rect width="200" height="120" fill="url(#grad)" rx="8"/>
                        <text x="100" y="50" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="Arial, sans-serif" font-size="24">🖼️</text>
                        <text x="100" y="75" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="12">Image non disponible</text>
                    </svg>
                `);
        this.onerror = null; // Évite les boucles

        if (this.src.startsWith("http")) {
          console.log(`[IMG] fallback applied: ${this.src}`);
        }
      }
    };
  });
}

// Données démo réalistes à injecter (avec images stables)
const DEMO_CONTENT = {
  games: [
    {
      id: "zelda-totk",
      title: "The Legend of Zelda: Tears of the Kingdom",
      description:
        "Suite exceptionnelle de Breath of the Wild avec de nouvelles mécaniques de construction et d'exploration verticale révolutionnaires.",
      image:
        "https://www.nintendo.com/content/dam/noa/en_US/games/switch/t/the-legend-of-zelda-tears-of-the-kingdom-switch/the-legend-of-zelda-tears-of-the-kingdom-switch-hero.jpg",
      platforms: ["Switch"],
      genres: ["Action", "Aventure"],
      rating: 4.8,
      demo: true,
    },
    {
      id: "baldurs-gate-3",
      title: "Baldur's Gate 3",
      description:
        "RPG tactique révolutionnaire basé sur les règles D&D, offrant une liberté d'action et de narration sans précédent.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["RPG"],
      rating: 4.9,
      demo: true,
    },
    {
      id: "elden-ring",
      title: "Elden Ring",
      description:
        "Action-RPG ouvert créé par FromSoftware et George R.R. Martin, alliant exploration, combat difficile et lore riche.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["Action", "RPG"],
      rating: 4.7,
      demo: true,
    },
    {
      id: "cyberpunk-2077",
      title: "Cyberpunk 2077",
      description:
        "RPG futuriste dans un monde ouvert dystopique, avec des choix narratifs impactants et un univers cyberpunk riche.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["RPG", "Action"],
      rating: 4.2,
      demo: true,
    },
    {
      id: "god-of-war-ragnarok",
      title: "God of War Ragnarök",
      description:
        "Suite épique de la série God of War, concluant l'histoire de Kratos et Atreus dans les royaumes nordiques.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/2344520/header.jpg",
      platforms: ["PS5"],
      genres: ["Action", "Aventure"],
      rating: 4.8,
      demo: true,
    },
    {
      id: "spider-man-2",
      title: "Marvel's Spider-Man 2",
      description:
        "Nouvelle aventure de Spider-Man avec Peter Parker et Miles Morales, dans une New York plus grande et plus vivante.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/2652250/header.jpg",
      platforms: ["PS5"],
      genres: ["Action", "Aventure"],
      rating: 4.6,
      demo: true,
    },
    {
      id: "helldivers-2",
      title: "Helldivers 2",
      description:
        "Shoot'em up coopératif chaotique où les joueurs combattent des hordes d'aliens dans une guerre galactique.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/553850/capsule_616x353.jpg",
      platforms: ["PC", "PS5"],
      genres: ["Action", "Coopératif"],
      rating: 4.4,
      demo: true,
    },
    {
      id: "alan-wake-2",
      title: "Alan Wake 2",
      description:
        "Suite du survival horror narratif, mêlant enquête, action et éléments de réalité altérée.",
      image:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202306/1310/42b1baff1b6e8a0b4fb4f0f2d2c8b0b9e7f3e8f8.png",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["Horreur", "Aventure"],
      rating: 4.3,
      demo: true,
    },
    {
      id: "red-dead-redemption-2",
      title: "Red Dead Redemption 2",
      description:
        "Épopée western magistrale avec un monde ouvert immense et une histoire captivante dans l'Amérique du début du XXème siècle.",
      image:
        "https://cdn.akamai.steamstatic.com/cdn/EP1003/CUSA03041_00/OFICSTOREART0.png",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["Action", "Aventure"],
      rating: 4.8,
      demo: true,
    },
    {
      id: "the-witcher-3",
      title: "The Witcher 3: Wild Hunt",
      description:
        "RPG épique avec un monde ouvert fantastique, des choix moraux impactants et une quête principale mémorable.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["RPG"],
      rating: 4.7,
      demo: true,
    },
    {
      id: "hades",
      title: "Hades",
      description:
        "Roguelike d'action avec une histoire captivante, des mécaniques de combat excellentes et une direction artistique remarquable.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/capsule_616x353.jpg",
      platforms: ["PC", "Switch"],
      genres: ["Action", "Roguelike"],
      rating: 4.8,
      demo: true,
    },
    {
      id: "hollow-knight",
      title: "Hollow Knight",
      description:
        "Metroidvania 2D atmosphérique avec un univers riche, des combats exigeants et une exploration gratifiante.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/367520/capsule_616x353.jpg",
      platforms: ["PC", "Switch", "PS5", "Xbox Series X"],
      genres: ["Action", "Metroidvania"],
      rating: 4.6,
      demo: true,
    },
    {
      id: "diablo-iv",
      title: "Diablo IV",
      description:
        "Action-RPG traditionnel de Blizzard, revenant aux racines de la série avec un monde ouvert sombre et addictif.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/2344520/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["Action", "RPG"],
      rating: 3.8,
      demo: true,
    },
    {
      id: "hogwarts-legacy",
      title: "Hogwarts Legacy",
      description:
        "RPG d'action dans l'univers Harry Potter, permettant d'explorer Poudlard et ses environs magiques.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["RPG", "Aventure"],
      rating: 4.4,
      demo: true,
    },
    {
      id: "starfield",
      title: "Starfield",
      description:
        "RPG spatial ambitieux développé par Bethesda, explorant la galaxie et les colonies humaines.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/capsule_616x353.jpg",
      platforms: ["PC", "Xbox Series X"],
      genres: ["RPG", "Simulation"],
      rating: 3.8,
      demo: true,
    },
    {
      id: "gta-v",
      title: "Grand Theft Auto V",
      description:
        "Monstre sacré du jeu ouvert, avec trois protagonistes, une histoire démente et un monde de jeu immense.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/271590/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["Action", "Aventure"],
      rating: 4.5,
      demo: true,
    },
    {
      id: "among-us",
      title: "Among Us",
      description:
        "Jeu multijoueur de déduction sociale où les joueurs doivent identifier les imposteurs parmi l'équipage.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/945360/capsule_616x353.jpg",
      platforms: ["PC", "Mobile"],
      genres: ["Party", "Multiplayer"],
      rating: 4.0,
      demo: true,
    },
    {
      id: "fortnite",
      title: "Fortnite",
      description:
        "Battle Royale avec construction, événements spéciaux et mode créatif, devenu un phénomène culturel.",
      image:
        "https://cdn2.unrealengine.com/fortnite-marketing-site/en-US/social-16x9.jpg",
      platforms: ["PC", "PS5", "Xbox Series X", "Mobile"],
      genres: ["Action", "Battle Royale"],
      rating: 3.9,
      demo: true,
    },
    {
      id: "rocket-league",
      title: "Rocket League",
      description:
        "Sport mécanique mélangeant football et voitures, avec des mécaniques de jeu accessibles et addictives.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/252950/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X", "Switch"],
      genres: ["Sport", "Course"],
      rating: 4.3,
      demo: true,
    },
    {
      id: "stardew-valley",
      title: "Stardew Valley",
      description:
        "Simulation agricole relaxante avec farming, relations sociales et exploration dans un monde pixel art.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/413150/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X", "Switch", "Mobile"],
      genres: ["Simulation", "RPG"],
      rating: 4.7,
      demo: true,
    },
  ],

  articles: {
    actu: [
      {
        id: "ps5-showcase-2024",
        title: "PlayStation Showcase 2024 : Les annonces majeures",
        excerpt:
          "Sony dévoile ses prochains hits avec Spider-Man 3, God of War Ragnarök Valhalla et bien d'autres surprises.",
        cover:
          "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202309/2702/52f0f5c0343b72b4bd6f5c6c3a2bb5c8a2e6b8c6.png",
        category: "actu",
        publishedAt: "2024-01-15T10:00:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Le PlayStation Showcase 2024 a tenu toutes ses promesses avec des annonces majeures pour les fans de la PlayStation.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "xbox-games-showcase-2024",
        title: "Xbox Games Showcase : Une pluie d'annonces",
        excerpt:
          "Microsoft impressionne avec de nouveaux titres Starfield, Forza Motorsport et des exclusivités Game Pass.",
        cover:
          "https://news.xbox.com/en-us/wp-content/uploads/sites/2/2024/06/XboxGamesShowcase2024_KeyArt_1920x1080.jpg",
        category: "actu",
        publishedAt: "2024-01-14T14:30:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Microsoft a présenté sa vision gaming pour les prochaines années avec des exclusivités impressionnantes.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "nintendo-direct-june-2024",
        title: "Nintendo Direct : Focus sur l'innovation",
        excerpt:
          "Nintendo présente de nouveaux jeux pour Switch et tease la future console portable.",
        cover:
          "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/en_US/articles/2024/nintendo-direct-6-18-2024/featured",
        category: "actu",
        publishedAt: "2024-01-13T09:15:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Le Nintendo Direct de juin 2024 a mis l'accent sur l'innovation et les nouvelles expériences.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "steam-deck-oled-review",
        title: "Steam Deck OLED : Une mise à jour réussie",
        excerpt:
          "Valve améliore sa console portable avec un écran OLED et une meilleure autonomie.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/store/home/store_home_share.jpg",
        category: "actu",
        publishedAt: "2024-01-12T16:45:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "La nouvelle Steam Deck OLED apporte des améliorations significatives à l'expérience portable.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "baldurs-gate-3-sales-record",
        title: "Baldur's Gate 3 : Record de ventes battu",
        excerpt:
          "Le RPG de Larian Studios dépasse les 20 millions d'exemplaires vendus.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg",
        category: "actu",
        publishedAt: "2024-01-11T11:20:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Baldur's Gate 3 continue de cartonner et bat de nouveaux records de ventes.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "elden-ring-shadow-of-the-erdtree",
        title: "Elden Ring : Shadow of the Erdtree en développement",
        excerpt:
          "FromSoftware confirme l'extension majeure pour le jeu acclamé.",
        cover:
          "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202107/1612/Y5RHNmzAtc6sRYwZlZWkgOWJ.png",
        category: "actu",
        publishedAt: "2024-01-10T13:10:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Shadow of the Erdtree s'annonce comme une extension majeure pour Elden Ring.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "cyberpunk-phantom-liberty-review",
        title: "Cyberpunk 2077 : Phantom Liberty acclamé",
        excerpt:
          "L'extension de CD Projekt RED reçoit des critiques positives malgré les bugs initiaux.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/capsule_616x353.jpg",
        category: "actu",
        publishedAt: "2024-01-09T15:30:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Phantom Liberty apporte du contenu frais et de qualité à Cyberpunk 2077.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "hogwarts-legacy-success",
        title: "Hogwarts Legacy : Succès commercial confirmé",
        excerpt:
          "Le jeu Harry Potter dépasse les 25 millions de copies vendues.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/capsule_616x353.jpg",
        category: "actu",
        publishedAt: "2024-01-08T12:00:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Hogwarts Legacy confirme son statut de succès commercial majeur.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "gaming-industry-growth",
        title: "Industrie : Le gaming dépasse le cinéma au box-office",
        excerpt:
          "Les jeux vidéo génèrent plus de revenus que l'industrie cinématographique.",
        cover:
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200",
        category: "actu",
        publishedAt: "2024-01-07T10:45:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Le gaming continue sa croissance fulgurante et dépasse désormais le cinéma.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "metroid-prime-4-announcement",
        title: "Metroid Prime 4 : Annoncé officiellement",
        excerpt:
          "Nintendo confirme enfin le développement du jeu tant attendu.",
        cover:
          "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063780/9989957eae3a6b545194c42fec207aad5b2cc1043c8e4a4a6a646e47544b7b0fc",
        category: "actu",
        publishedAt: "2024-01-06T14:20:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Metroid Prime 4 est enfin officiel et suscite beaucoup d'enthousiasme.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "steam-peak-concurrent-users",
        title: "Steam : Nouveaux records de connexions",
        excerpt:
          "La plateforme bat ses records avec plus de 30 millions d'utilisateurs simultanés.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/store/home/store_home_share.jpg",
        category: "actu",
        publishedAt: "2024-01-05T09:30:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Steam continue de battre ses records de popularité.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "ea-sports-fc-25-rebrand",
        title: "EA Sports FC 25 : Changement de nom officiel",
        excerpt:
          "Fifa devient EA Sports FC avec une nouvelle approche marketing.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/2669320/capsule_616x353.jpg",
        category: "actu",
        publishedAt: "2024-01-04T16:15:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "EA Sports FC 25 marque la fin de l'ère FIFA pour Electronic Arts.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "ubisoft-new-studios",
        title: "Ubisoft : Nouveaux studios en développement",
        excerpt:
          "L'éditeur français annonce l'ouverture de studios en Suède et en Espagne.",
        cover:
          "https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy69uqbjxBSd33xIvvzf2K9Q/prismic/field/image/Z2V0SW5Ub3VjaFdpdGhHYW1pbmd8ZWFhZWJiNjMtODM3ZC00NzY4LWI2ZGYtNmM5MmM3ZmM2MzM3fGVhLWFzc2V0cy1pbWFnZS1oZWFkZXI=",
        category: "actu",
        publishedAt: "2024-01-03T11:45:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Ubisoft continue d'investir dans de nouveaux studios européens.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
    ],

    guides: [
      {
        id: "guide-zelda-totk",
        title: "Guide complet Zelda : Tears of the Kingdom",
        excerpt:
          "Maîtrisez toutes les mécaniques et explorez chaque recoin du royaume d'Hyrule.",
        cover:
          "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063780/9989957eae3a6b545194c42fec207aad5b2cc1043c8e4a4a6a646e47544b7b0fc",
        category: "guide",
        publishedAt: "2024-01-15T08:00:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Guide complet pour maîtriser Zelda : Tears of the Kingdom.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "builds-bg3",
        title: "Builds optimaux Baldur's Gate 3",
        excerpt:
          "Les meilleures combinaisons de classes et de sorts pour dominer les combats.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg",
        category: "guide",
        publishedAt: "2024-01-14T10:30:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Guide des builds optimaux pour Baldur's Gate 3.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "secrets-elden-ring",
        title: "Secrets cachés d'Elden Ring",
        excerpt:
          "Découvrez tous les boss optionnels et les zones secrètes du jeu.",
        cover:
          "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202107/1612/Y5RHNmzAtc6sRYwZlZWkgOWJ.png",
        category: "guide",
        publishedAt: "2024-01-13T12:15:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Guide des secrets d'Elden Ring.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "tips-god-of-war",
        title: "Astuces God of War Ragnarök",
        excerpt:
          "Maximisez votre expérience avec ces conseils pour les combats et l'exploration.",
        cover:
          "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0.png",
        category: "guide",
        publishedAt: "2024-01-12T14:45:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Astuces essentielles pour God of War Ragnarök.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "routes-spider-man-2",
        title: "Routes optimisées Spider-Man 2",
        excerpt: "Parcourez Manhattan de la manière la plus efficace possible.",
        cover:
          "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202306/1219/1c2d8c1c87ab30eca44e72dc8741cd5d24ea85a8cfdb2f95.png",
        category: "guide",
        publishedAt: "2024-01-11T09:20:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Guide des routes optimisées pour Spider-Man 2.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "survival-resident-evil-4",
        title: "Survie Resident Evil 4 Remake",
        excerpt: "Gérez vos ressources et survivez aux hordes de Ganado.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/capsule_616x353.jpg",
        category: "guide",
        publishedAt: "2024-01-10T16:30:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Guide de survie pour Resident Evil 4 Remake.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "exploration-cyberpunk",
        title: "Exploration complète Cyberpunk 2077",
        excerpt:
          "Visitez tous les districts et complétez votre carte de Night City.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/capsule_616x353.jpg",
        category: "guide",
        publishedAt: "2024-01-09T11:10:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Guide d'exploration pour Cyberpunk 2077.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "magical-houses-hogwarts",
        title: "Maisons magiques Hogwarts Legacy",
        excerpt:
          "Personnalisez votre demeure avec tous les secrets disponibles.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/capsule_616x353.jpg",
        category: "guide",
        publishedAt: "2024-01-08T13:25:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Guide des maisons magiques dans Hogwarts Legacy.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "space-navigation-starfield",
        title: "Navigation spatiale Starfield",
        excerpt:
          "Maîtrisez les mécaniques de vol et d'exploration de l'espace.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/capsule_616x353.jpg",
        category: "guide",
        publishedAt: "2024-01-07T15:40:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Guide de navigation spatiale pour Starfield.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "character-creation-sims-4",
        title: "Création de personnages The Sims 4",
        excerpt: "Tous les traits et aspirations pour créer le sim parfait.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/1222670/capsule_616x353.jpg",
        category: "guide",
        publishedAt: "2024-01-06T10:55:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Guide de création de personnages pour The Sims 4.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "advanced-minecraft",
        title: "Constructions avancées Minecraft",
        excerpt: "Du simple abri à la base automatique, maîtrisez le crafting.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/221100/capsule_616x353.jpg",
        category: "guide",
        publishedAt: "2024-01-05T12:30:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Guide des constructions avancées Minecraft.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "strategies-among-us",
        title: "Stratégies Among Us",
        excerpt: "Devenez le meilleur imposteur ou le détective ultime.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/945360/capsule_616x353.jpg",
        category: "guide",
        publishedAt: "2024-01-04T14:15:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Guide des stratégies pour Among Us.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
      {
        id: "advanced-fortnite",
        title: "Techniques avancées Fortnite",
        excerpt: "Maîtrisez le building et les armes pour dominer les parties.",
        cover:
          "https://cdn2.unrealengine.com/fortnite-marketing-site/en-US/social-16x9.jpg",
        category: "guide",
        publishedAt: "2024-01-03T16:50:00Z",
        contentBlocks: [
          {
            type: "text",
            text: "Guide avancé pour Fortnite.",
            blockId: "block-1",
          },
        ],
        demo: true,
      },
    ],
  },

  tests: [
    {
      id: "test-zelda-totk",
      title: "Test complet Zelda : Tears of the Kingdom",
      excerpt:
        "Une suite exceptionnelle qui élève encore plus haut la barre de l'open-world.",
      content:
        "Zelda : Tears of the Kingdom est tout simplement exceptionnel. Nintendo a réussi à innover tout en gardant l'essence de la série. Les mécaniques de construction et de fusion sont révolutionnaires.",
      coverUrl:
        "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063780/9989957eae3a6b545194c42fec207aad5b2cc1043c8e4a4a6a646e47544b7b0fc",
      gameId: "zelda-totk",
      score: 9.5,
      criteria: [
        { label: "Gameplay", score: 9.8 },
        { label: "Direction artistique", score: 9.7 },
        { label: "Durée de vie", score: 9.6 },
        { label: "Innovation", score: 10 },
        { label: "Narration", score: 8.5 },
      ],
      publishedAt: "2024-01-15T08:00:00Z",
      demo: true,
    },
    {
      id: "avis-baldurs-gate-3",
      title: "Avis Baldur's Gate 3 : Le RPG ultime",
      excerpt: "Un chef-d'œuvre tactique qui redéfinit le genre RPG moderne.",
      content:
        "Baldur's Gate 3 est le jeu que tout amateur de RPG attendait. Larian Studios a créé un monde vivant avec des mécaniques de combat tactiques exceptionnelles.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg",
      gameId: "baldurs-gate-3",
      score: 9.7,
      criteria: [
        { label: "Système de combat", score: 9.9 },
        { label: "Narration", score: 9.8 },
        { label: "Liberté d'action", score: 9.5 },
        { label: "Rejouabilité", score: 9.6 },
        { label: "Interface", score: 9.2 },
      ],
      publishedAt: "2024-01-14T10:30:00Z",
      demo: true,
    },
    {
      id: "critique-elden-ring",
      title: "Test Elden Ring : Un monument du gaming",
      excerpt:
        "Difficile mais juste, FromSoftware livre une expérience inoubliable.",
      content:
        "Elden Ring représente l'apogée du travail de FromSoftware. La difficulté est légendaire mais toujours juste et gratifiante.",
      coverUrl:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202107/1612/Y5RHNmzAtc6sRYwZlZWkgOWJ.png",
      gameId: "elden-ring",
      score: 9.3,
      criteria: [
        { label: "Difficulté", score: 9.8 },
        { label: "Direction artistique", score: 9.5 },
        { label: "Gameplay", score: 9.2 },
        { label: "Durée de vie", score: 9.4 },
        { label: "Immersion", score: 9.0 },
      ],
      publishedAt: "2024-01-13T12:15:00Z",
      demo: true,
    },
    {
      id: "critique-god-of-war-ragnarok",
      title: "Critique God of War Ragnarök",
      excerpt: "Une conclusion épique à la saga de Kratos et Atreus.",
      content:
        "God of War Ragnarök achève magnifiquement la nouvelle trilogie. L'histoire est touchante et les combats épiques.",
      coverUrl:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0.png",
      gameId: "god-of-war-ragnarok",
      score: 9.2,
      criteria: [
        { label: "Narration", score: 9.8 },
        { label: "Gameplay", score: 9.3 },
        { label: "Direction artistique", score: 9.4 },
        { label: "Bande-son", score: 9.5 },
        { label: "Durée de vie", score: 8.5 },
      ],
      publishedAt: "2024-01-12T14:45:00Z",
      demo: true,
    },
    {
      id: "avis-spider-man-2",
      title: "Avis Spider-Man 2 : Un retour réussi",
      excerpt:
        "Marvel's Spider-Man 2 confirme l'excellence de la série sur PS5.",
      content:
        "Spider-Man 2 élève encore la barre avec Miles Morales et ses nouvelles capacités électrifiées.",
      coverUrl:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202306/1219/1c2d8c1c87ab30eca44e72dc8741cd5d24ea85a8cfdb2f95.png",
      gameId: "spider-man-2",
      score: 8.9,
      criteria: [
        { label: "Gameplay", score: 9.2 },
        { label: "Narration", score: 8.8 },
        { label: "Direction artistique", score: 9.0 },
        { label: "Technologie", score: 9.4 },
        { label: "Durée de vie", score: 8.5 },
      ],
      publishedAt: "2024-01-11T09:20:00Z",
      demo: true,
    },
    {
      id: "test-resident-evil-4-remake",
      title: "Test Resident Evil 4 Remake",
      excerpt:
        "Un survival horror moderne qui respecte ses origines tout en innovant.",
      content:
        "Capcom a parfaitement réussi son remake avec des graphismes modernes et des mécaniques améliorées.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/capsule_616x353.jpg",
      gameId: "helldivers-2",
      score: 9.0,
      criteria: [
        { label: "Atmosphère", score: 9.5 },
        { label: "Gameplay", score: 9.2 },
        { label: "Technologie", score: 8.8 },
        { label: "Durée de vie", score: 8.9 },
        { label: "Rejouabilité", score: 8.8 },
      ],
      publishedAt: "2024-01-10T16:30:00Z",
      demo: true,
    },
    {
      id: "critique-cyberpunk-phantom-liberty",
      title: "Critique Cyberpunk 2077 : Phantom Liberty",
      excerpt: "L'extension rachète les défauts du jeu de base.",
      content:
        "Phantom Liberty transforme Cyberpunk 2077 en l'expérience qu'il aurait dû être dès le départ.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/capsule_616x353.jpg",
      gameId: "cyberpunk-2077",
      score: 8.5,
      criteria: [
        { label: "Contenu", score: 9.0 },
        { label: "Narration", score: 8.8 },
        { label: "Gameplay", score: 8.5 },
        { label: "Durée de vie", score: 9.2 },
        { label: "Prix", score: 7.5 },
      ],
      publishedAt: "2024-01-09T11:10:00Z",
      demo: true,
    },
    {
      id: "test-hogwarts-legacy",
      title: "Test Hogwarts Legacy",
      excerpt: "Un RPG magique qui ravira les fans d'Harry Potter.",
      content:
        "Avalanche Software livre une adaptation réussie de l'univers Harry Potter avec un monde ouvert magique.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/capsule_616x353.jpg",
      gameId: "hogwarts-legacy",
      score: 8.7,
      criteria: [
        { label: "Immersion", score: 9.5 },
        { label: "Gameplay", score: 8.8 },
        { label: "Direction artistique", score: 9.2 },
        { label: "Contenu", score: 8.5 },
        { label: "Bugs", score: 7.8 },
      ],
      publishedAt: "2024-01-08T13:25:00Z",
      demo: true,
    },
    {
      id: "avis-starfield",
      title: "Avis Starfield : Ambitieux mais perfectible",
      excerpt: "Bethesda explore l'espace avec un RPG ambitieux mais inachevé.",
      content:
        "Starfield représente un énorme pas en avant pour Bethesda mais souffre de quelques lacunes.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/capsule_616x353.jpg",
      gameId: "starfield",
      score: 7.5,
      criteria: [
        { label: "Ambition", score: 9.0 },
        { label: "Direction artistique", score: 8.5 },
        { label: "Gameplay", score: 7.8 },
        { label: "Contenu", score: 7.2 },
        { label: "Performance", score: 6.8 },
      ],
      publishedAt: "2024-01-07T15:40:00Z",
      demo: true,
    },
    {
      id: "test-sims-4-cottage-living",
      title: "Test The Sims 4 : Cottage Living",
      excerpt:
        "Une extension agricole qui apporte fraîcheur à la simulation de vie.",
      content:
        "Cottage Living ramène The Sims 4 à ses racines agricoles avec de nombreuses nouvelles activités.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1222670/capsule_616x353.jpg",
      gameId: "stardew-valley",
      score: 8.2,
      criteria: [
        { label: "Nouveautés", score: 8.8 },
        { label: "Gameplay", score: 8.5 },
        { label: "Graphismes", score: 8.0 },
        { label: "Durée de vie", score: 8.2 },
        { label: "Prix", score: 7.8 },
      ],
      publishedAt: "2024-01-06T10:55:00Z",
      demo: true,
    },
    {
      id: "critique-minecraft-timeless",
      title: "Critique Minecraft : Timeless Classic",
      excerpt: "Un jeu qui ne vieillit pas et continue d'innover.",
      content:
        "Vingt ans après sa sortie, Minecraft reste une référence incontournable du gaming.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/221100/capsule_616x353.jpg",
      gameId: "minecraft",
      score: 9.8,
      criteria: [
        { label: "Créativité", score: 10 },
        { label: "Durée de vie", score: 10 },
        { label: "Communauté", score: 9.5 },
        { label: "Accessibilité", score: 9.8 },
        { label: "Innovation", score: 9.6 },
      ],
      publishedAt: "2024-01-05T12:30:00Z",
      demo: true,
    },
    {
      id: "test-among-us-social-deduction",
      title: "Test Among Us : Social Deduction Master",
      excerpt: "Un jeu simple mais addictif qui divise les amis.",
      content:
        "Among Us a révolutionné le gaming mobile et multijoueur avec ses mécaniques de déduction sociale.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/945360/capsule_616x353.jpg",
      gameId: "among-us",
      score: 8.5,
      criteria: [
        { label: "Gameplay", score: 9.0 },
        { label: "Addictivité", score: 8.8 },
        { label: "Social", score: 9.5 },
        { label: "Prix", score: 8.0 },
        { label: "Rejouabilité", score: 7.5 },
      ],
      publishedAt: "2024-01-04T14:15:00Z",
      demo: true,
    },
    {
      id: "avis-fortnite-evolution",
      title: "Avis Fortnite : Battle Royale Evolution",
      excerpt: "Epic Games continue d'innover malgré la saturation du marché.",
      content:
        "Fortnite a transcendé le simple battle royale pour devenir un phénomène culturel à part entière.",
      coverUrl:
        "https://cdn2.unrealengine.com/fortnite-marketing-site/en-US/social-16x9.jpg",
      gameId: "fortnite",
      score: 8.0,
      criteria: [
        { label: "Innovation", score: 9.5 },
        { label: "Communauté", score: 8.5 },
        { label: "Gameplay", score: 8.2 },
        { label: "Monétisation", score: 6.5 },
        { label: "Performance", score: 8.0 },
      ],
      publishedAt: "2024-01-03T16:50:00Z",
      demo: true,
    },
  ],

  bonsPlans: [
    {
      id: "gow-ragnarok-60-steam",
      title: "God of War Ragnarök -60% sur Steam",
      excerpt:
        "Profitez de la meilleure réduction actuelle sur le jeu de l'année 2022.",
      coverUrl:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0.png",
      externalUrl:
        "https://store.steampowered.com/app/2344520/God_of_War_Ragnark/",
      merchant: "Steam",
      price: 39.99,
      oldPrice: 99.99,
      discountPercent: 60,
      publishedAt: "2024-01-20T08:00:00Z",
      isFeatured: true,
      demo: true,
    },
    {
      id: "baldurs-gate-3-reduction",
      title: "Baldur's Gate 3 à prix réduit",
      excerpt: "Le RPG de l'année disponible avec une remise exceptionnelle.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/1086940/Baldurs_Gate_3/",
      merchant: "Steam",
      price: 44.99,
      oldPrice: 59.99,
      discountPercent: 25,
      publishedAt: "2024-01-18T10:30:00Z",
      isFeatured: true,
      demo: true,
    },
    {
      id: "elden-ring-complete-edition",
      title: "Elden Ring - Edition Deluxe",
      excerpt: "L'expérience complète avec tous les DLC à prix réduit.",
      coverUrl:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202107/1612/Y5RHNmzAtc6sRYwZlZWkgOWJ.png",
      externalUrl: "https://store.steampowered.com/app/1245620/ELDEN_RING/",
      merchant: "Steam",
      price: 35.99,
      oldPrice: 49.99,
      discountPercent: 28,
      publishedAt: "2024-01-16T14:15:00Z",
      isFeatured: false,
      demo: true,
    },
    {
      id: "spider-man-2-ps5-best-price",
      title: "Spider-Man 2 PS5 - Meilleur prix",
      excerpt: "L'exclusivité PS5 proposée au tarif le plus bas du marché.",
      coverUrl:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202306/1219/1c2d8c1c87ab30eca44e72dc8741cd5d24ea85a8cfdb2f95.png",
      externalUrl: "https://www.amazon.fr/dp/B0C8VH2H8L",
      merchant: "Amazon",
      price: 59.99,
      oldPrice: 79.99,
      discountPercent: 25,
      publishedAt: "2024-01-14T12:45:00Z",
      isFeatured: true,
      demo: true,
    },
    {
      id: "cyberpunk-plus-phantom-liberty",
      title: "Cyberpunk 2077 + Phantom Liberty",
      excerpt: "Le jeu complet avec son extension à prix réduit.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/1091500/Cyberpunk_2077/",
      merchant: "Steam",
      price: 29.99,
      oldPrice: 39.99,
      discountPercent: 25,
      publishedAt: "2024-01-12T09:20:00Z",
      isFeatured: false,
      demo: true,
    },
    {
      id: "hogwarts-legacy-complete-edition",
      title: "Hogwarts Legacy - Édition Complète",
      excerpt: "Tous les DLC inclus avec une belle réduction.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/990080/Hogwarts_Legacy/",
      merchant: "Steam",
      price: 39.99,
      oldPrice: 59.99,
      discountPercent: 33,
      publishedAt: "2024-01-10T16:30:00Z",
      isFeatured: true,
      demo: true,
    },
    {
      id: "resident-evil-4-remake-limited-offer",
      title: "Resident Evil 4 Remake - Offre limitée",
      excerpt: "Le remake tant attendu à prix cassé.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/capsule_616x353.jpg",
      externalUrl:
        "https://store.steampowered.com/app/2050650/Resident_Evil_4/",
      merchant: "Steam",
      price: 49.99,
      oldPrice: 59.99,
      discountPercent: 17,
      publishedAt: "2024-01-08T11:10:00Z",
      isFeatured: false,
      demo: true,
    },
    {
      id: "zelda-totk-bundle-nintendo",
      title: "Zelda : Tears of the Kingdom - Bundle",
      excerpt: "Le jeu + la console Nintendo Switch OLED.",
      coverUrl:
        "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063780/9989957eae3a6b545194c42fec207aad5b2cc1043c8e4a4a6a646e47544b7b0fc",
      externalUrl: "https://www.amazon.fr/dp/B0C8VH2H8L",
      merchant: "Amazon",
      price: 299.99,
      oldPrice: 349.99,
      discountPercent: 14,
      publishedAt: "2024-01-06T13:25:00Z",
      isFeatured: true,
      demo: true,
    },
    {
      id: "starfield-premium-edition",
      title: "Starfield - Édition Premium",
      excerpt: "Toutes les extensions incluses à prix réduit.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/1716740/Starfield/",
      merchant: "Steam",
      price: 54.99,
      oldPrice: 69.99,
      discountPercent: 21,
      publishedAt: "2024-01-04T15:40:00Z",
      isFeatured: false,
      demo: true,
    },
    {
      id: "sims-4-complete-pack",
      title: "The Sims 4 - Pack Complet",
      excerpt: "Tous les DLC et packs de jeu à prix réduit.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1222670/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/1222670/The_Sims_4/",
      merchant: "Steam",
      price: 19.99,
      oldPrice: 39.99,
      discountPercent: 50,
      publishedAt: "2024-01-02T10:55:00Z",
      isFeatured: false,
      demo: true,
    },
    {
      id: "minecraft-legacy-edition",
      title: "Minecraft - Édition Legacy",
      excerpt: "Le jeu classique avec tous les anciens contenus.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/221100/capsule_616x353.jpg",
      externalUrl:
        "https://www.minecraft.net/fr-fr/store/minecraft-java-edition",
      merchant: "Mojang",
      price: 26.95,
      oldPrice: 29.99,
      discountPercent: 10,
      publishedAt: "2023-12-30T12:15:00Z",
      isFeatured: true,
      demo: true,
    },
    {
      id: "among-us-social-bundle",
      title: "Among Us - Bundle Social",
      excerpt: "Le jeu + tous les cosmétiques et skins spéciaux.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/945360/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/945360/Among_Us/",
      merchant: "Steam",
      price: 3.99,
      oldPrice: 4.99,
      discountPercent: 20,
      publishedAt: "2023-12-28T14:20:00Z",
      isFeatured: false,
      demo: true,
    },
    {
      id: "fortnite-season-pass-discount",
      title: "Fortnite - Battle Pass Saison",
      excerpt: "Accès anticipé au nouveau Battle Pass avec 30% de réduction.",
      coverUrl:
        "https://cdn2.unrealengine.com/fortnite-marketing-site/en-US/social-16x9.jpg",
      externalUrl: "https://www.epicgames.com/store/fr/p/fortnite",
      merchant: "Epic Games",
      price: 9.79,
      oldPrice: 13.99,
      discountPercent: 30,
      publishedAt: "2023-12-26T16:35:00Z",
      isFeatured: true,
      demo: true,
    },
    {
      id: "rocket-league-deluxe-edition",
      title: "Rocket League - Édition Deluxe",
      excerpt: "Tous les DLC et voitures premium à prix réduit.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/252950/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/252950/Rocket_League/",
      merchant: "Steam",
      price: 15.99,
      oldPrice: 19.99,
      discountPercent: 20,
      publishedAt: "2023-12-24T09:45:00Z",
      isFeatured: false,
      demo: true,
    },
  ],

  promos: [
    {
      id: "promo-gow-ragnarok",
      title: "God of War Ragnarök -60%",
      image:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0.png",
      link: "https://store.steampowered.com/app/2344520/God_of_War_Ragnark/",
      discount: 60,
      demo: true,
    },
    {
      id: "promo-bg3",
      title: "Baldur's Gate 3 -25%",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg",
      link: "https://store.steampowered.com/app/1086940/Baldurs_Gate_3/",
      discount: 25,
      demo: true,
    },
    {
      id: "promo-elden-ring",
      title: "Elden Ring -28%",
      image:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202107/1612/Y5RHNmzAtc6sRYwZlZWkgOWJ.png",
      link: "https://store.steampowered.com/app/1245620/ELDEN_RING/",
      discount: 28,
      demo: true,
    },
    {
      id: "promo-spider-man-2",
      title: "Spider-Man 2 -25%",
      image:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202306/1219/1c2d8c1c87ab30eca44e72dc8741cd5d24ea85a8cfdb2f95.png",
      link: "https://www.amazon.fr/dp/B0C8VH2H8L",
      discount: 25,
      demo: true,
    },
    {
      id: "promo-cyberpunk",
      title: "Cyberpunk 2077 -25%",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/capsule_616x353.jpg",
      link: "https://store.steampowered.com/app/1091500/Cyberpunk_2077/",
      discount: 25,
      demo: true,
    },
    {
      id: "promo-hogwarts",
      title: "Hogwarts Legacy -33%",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/capsule_616x353.jpg",
      link: "https://store.steampowered.com/app/990080/Hogwarts_Legacy/",
      discount: 33,
      demo: true,
    },
    {
      id: "promo-resident-evil-4",
      title: "Resident Evil 4 -17%",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/capsule_616x353.jpg",
      link: "https://store.steampowered.com/app/2050650/Resident_Evil_4/",
      discount: 17,
      demo: true,
    },
    {
      id: "promo-zelda-bundle",
      title: "Zelda + Switch -14%",
      image:
        "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063780/9989957eae3a6b545194c42fec207aad5b2cc1043c8e4a4a6a646e47544b7b0fc",
      link: "https://www.amazon.fr/dp/B0C8VH2H8L",
      discount: 14,
      demo: true,
    },
    {
      id: "promo-starfield",
      title: "Starfield -21%",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/capsule_616x353.jpg",
      link: "https://store.steampowered.com/app/1716740/Starfield/",
      discount: 21,
      demo: true,
    },
    {
      id: "promo-sims-4",
      title: "The Sims 4 -50%",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1222670/capsule_616x353.jpg",
      link: "https://store.steampowered.com/app/1222670/The_Sims_4/",
      discount: 50,
      demo: true,
    },
    {
      id: "promo-minecraft",
      title: "Minecraft -10%",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/221100/capsule_616x353.jpg",
      link: "https://www.minecraft.net/fr-fr/store/minecraft-java-edition",
      discount: 10,
      demo: true,
    },
    {
      id: "promo-among-us",
      title: "Among Us -20%",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/945360/capsule_616x353.jpg",
      link: "https://store.steampowered.com/app/945360/Among_Us/",
      discount: 20,
      demo: true,
    },
    {
      id: "promo-fortnite",
      title: "Fortnite Pass -30%",
      image:
        "https://cdn2.unrealengine.com/fortnite-marketing-site/en-US/social-16x9.jpg",
      link: "https://www.epicgames.com/store/fr/p/fortnite",
      discount: 30,
      demo: true,
    },
  ],

  partners: [
    {
      id: "partner-nvidia",
      name: "NVIDIA",
      description: "Leader des cartes graphiques et technologies GPU",
      logo: "https://www.nvidia.com/content/dam/en-zz/Solutions/about-nvidia/logo-and-brand/01-nvidia-logo-horiz-500x200-2c50-d@2x.png",
      website: "https://www.nvidia.com",
      demo: true,
    },
    {
      id: "partner-amd",
      name: "AMD",
      description: "Processeurs et cartes graphiques haute performance",
      logo: "https://www.amd.com/content/dam/amd/en/images/logo/amd-logo-black.svg",
      website: "https://www.amd.com",
      demo: true,
    },
    {
      id: "partner-intel",
      name: "Intel",
      description: "Processeurs et technologies informatiques innovantes",
      logo: "https://www.intel.com/content/dam/www/global/badges/intel-logo-classic-rwd.svg",
      website: "https://www.intel.com",
      demo: true,
    },
    {
      id: "partner-steam",
      name: "Steam",
      description: "La plus grande plateforme de jeux vidéo au monde",
      logo: "https://store.cloudflare.steamstatic.com/public/shared/images/header/logo_steam.svg",
      website: "https://store.steampowered.com",
      demo: true,
    },
    {
      id: "partner-epic-games",
      name: "Epic Games",
      description: "Créateur de Fortnite et détenteur de l'Epic Games Store",
      logo: "https://cdn2.unrealengine.com/epic-games-logo-1920x1080-1526b47cc41d.png",
      website: "https://www.epicgames.com",
      demo: true,
    },
    {
      id: "partner-playstation",
      name: "PlayStation",
      description: "Console de jeux leader avec un catalogue exclusif",
      logo: "https://www.playstation.com/etc.clientlibs/playstation/clientlibs/clientlib-vue/resources/img/nav/logo-ps.svg",
      website: "https://www.playstation.com",
      demo: true,
    },
    {
      id: "partner-xbox",
      name: "Xbox",
      description: "Écosystème complet de gaming Microsoft",
      logo: "https://www.xbox.com/etc.clientlibs/xbox/clientlibs/clientlib-site/resources/images/xbox-logo.svg",
      website: "https://www.xbox.com",
      demo: true,
    },
    {
      id: "partner-nintendo",
      name: "Nintendo",
      description: "Créateur de Mario, Zelda et d'expériences de jeu uniques",
      logo: "https://www.nintendo.com/etc.clientlibs/nintendo/clientlibs/clientlib-site/resources/images/logo.svg",
      website: "https://www.nintendo.com",
      demo: true,
    },
    {
      id: "partner-ubisoft",
      name: "Ubisoft",
      description:
        "Éditeur français de licences prestigieuses comme Assassin's Creed",
      logo: "https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy69uqbjxBSd33xIvvzf2K9Q/prismic/field/image/Z2V0SW5Ub3VjaFdpdGhHYW1pbmd8ZWFhZWJiNjMtODM3ZC00NzY4LWI2ZGYtNmM5MmM3ZmM2MzM3fGVhLWFzc2V0cy1pbWFnZS1oZWFkZXI=",
      website: "https://www.ubisoft.com",
      demo: true,
    },
    {
      id: "partner-cd-projekt",
      name: "CD Projekt",
      description: "Créateur de The Witcher et Cyberpunk 2077",
      logo: "https://www.cdprojekt.com/en/wp-content/themes/cdprojekt/dist/images/logo-en.svg",
      website: "https://www.cdprojekt.com",
      demo: true,
    },
    {
      id: "partner-rockstar",
      name: "Rockstar Games",
      description:
        "Développeur de GTA, Red Dead Redemption et autres blockbusters",
      logo: "https://www.rockstargames.com/assets/images/logo.png",
      website: "https://www.rockstargames.com",
      demo: true,
    },
    {
      id: "partner-valve",
      name: "Valve",
      description: "Créateur de Steam, Half-Life et Portal",
      logo: "https://cdn.cloudflare.steamstatic.com/store/about/logo_steam.svg",
      website: "https://www.valvesoftware.com",
      demo: true,
    },
    {
      id: "partner-bethesda",
      name: "Bethesda",
      description: "Filiale de Microsoft spécialisée dans les RPG",
      logo: "https://www.bethesda.net/assets/images/bethesda-logo.svg",
      website: "https://www.bethesda.net",
      demo: true,
    },
  ],
};

/**
 * Fonction principale d'injection du contenu démo
 */
function applyDemoInjection() {
  debugLog("DEMO", "Starting demo content injection...");

  try {
    // Injection des jeux
    injectDemoGames();

    // Injection des articles
    injectDemoArticles();

    // Injection des tests
    injectDemoTests();

    // Injection des bons plans
    injectDemoBonsPlans();

    // Injection des promos
    injectDemoPromos();

    // Injection des partenariats
    injectDemoPartners();

    const counts = {
      games: getGamesData().length,
      actu: getArticlesData().filter((a) => a.category === "actu").length,
      guides: getArticlesData().filter((a) => a.category === "guide").length,
      tests: getTestsData().length,
      bonsPlans: getBonsPlansData().length,
      promos: getPromosData().length,
      partners: getPartnersData().length,
    };
    debugLog(
      "DEMO",
      `Demo content injection completed: ${JSON.stringify(counts)}`,
    );
    updateAdminSiteCounters();
  } catch (error) {
    debugLog("DEMO", `Injection failed: ${error.message}`, "error");
  }
}

/**
 * Injection des jeux démo
 */
function injectDemoGames() {
  const existingGames = getGamesData();
  const existingIds = new Set(existingGames.map((g) => g.id));
  const gamesToAdd = DEMO_CONTENT.games.filter(
    (game) => !existingIds.has(game.id),
  );

  if (gamesToAdd.length === 0) {
    debugLog("DEMO", "Games: No new games to add");
    return;
  }

  const allGames = [...existingGames, ...gamesToAdd];
  saveGamesOverride(allGames);
  debugLog(
    "DEMO",
    `Games: Added ${gamesToAdd.length} games (total: ${allGames.length})`,
  );
}

/**
 * Injection des articles démo
 */
function injectDemoArticles() {
  const existingArticles = getArticlesData();
  const existingIds = new Set(existingArticles.map((a) => a.id));

  let totalAdded = 0;

  // Articles actu
  const actuToAdd = DEMO_CONTENT.articles.actu.filter(
    (article) => !existingIds.has(article.id),
  );
  totalAdded += actuToAdd.length;

  // Guides
  const guidesToAdd = DEMO_CONTENT.articles.guides.filter(
    (article) => !existingIds.has(article.id),
  );
  totalAdded += guidesToAdd.length;

  if (totalAdded === 0) {
    debugLog("DEMO", "Articles: No new articles to add");
    return;
  }

  const allArticles = [...existingArticles, ...actuToAdd, ...guidesToAdd];
  saveArticlesOverride(allArticles);
  debugLog(
    "DEMO",
    `Articles: Added ${totalAdded} articles (${actuToAdd.length} actu + ${guidesToAdd.length} guides, total: ${allArticles.length})`,
  );
}

/**
 * Injection des tests démo
 */
function injectDemoTests() {
  const existingTests = getTestsData();
  const existingIds = new Set(existingTests.map((t) => t.id));
  const testsToAdd = DEMO_CONTENT.tests.filter(
    (test) => !existingIds.has(test.id),
  );

  if (testsToAdd.length === 0) {
    debugLog("DEMO", "Tests: No new tests to add");
    return;
  }

  const allTests = [...existingTests, ...testsToAdd];
  saveTestsOverride(allTests);
  debugLog(
    "DEMO",
    `Tests: Added ${testsToAdd.length} tests (total: ${allTests.length})`,
  );
}

/**
 * Injection des bons plans démo
 */
function injectDemoBonsPlans() {
  const existingBonsPlans = getBonsPlansData();
  const existingIds = new Set(existingBonsPlans.map((bp) => bp.id));
  const bonsPlansToAdd = DEMO_CONTENT.bonsPlans.filter(
    (bp) => !existingIds.has(bp.id),
  );

  if (bonsPlansToAdd.length === 0) {
    debugLog("DEMO", "Bons Plans: No new deals to add");
    return;
  }

  const allBonsPlans = [...existingBonsPlans, ...bonsPlansToAdd];
  saveBonsPlansOverride(allBonsPlans);
  debugLog(
    "DEMO",
    `Bons Plans: Added ${bonsPlansToAdd.length} deals (total: ${allBonsPlans.length})`,
  );
}

/**
 * Injection des promos démo
 */
function injectDemoPromos() {
  const existingPromos = getPromosData();
  const existingIds = new Set(existingPromos.map((p) => p.id));
  const promosToAdd = DEMO_CONTENT.promos.filter(
    (promo) => !existingIds.has(promo.id),
  );

  if (promosToAdd.length === 0) {
    debugLog("DEMO", "Promos: No new promos to add");
    return;
  }

  const allPromos = [...existingPromos, ...promosToAdd];
  savePromosOverride(allPromos);
  debugLog(
    "DEMO",
    `Promos: Added ${promosToAdd.length} promos (total: ${allPromos.length})`,
  );
}

/**
 * Injection des partenariats démo
 */
function injectDemoPartners() {
  const existingPartners = getPartnersData();
  const existingIds = new Set(existingPartners.map((p) => p.id));
  const partnersToAdd = DEMO_CONTENT.partners.filter(
    (partner) => !existingIds.has(partner.id),
  );

  if (partnersToAdd.length === 0) {
    debugLog("DEMO", "Partners: No new partners to add");
    return;
  }

  const allPartners = [...existingPartners, ...partnersToAdd];
  savePartnersOverride(allPartners);
  debugLog(
    "DEMO",
    `Partners: Added ${partnersToAdd.length} partners (total: ${allPartners.length})`,
  );
}

/**
 * Reset du contenu démo (supprime seulement les éléments marqués demo:true)
 */
function resetDemoContent() {
  debugLog("DEMO", "Starting demo content reset...");

  try {
    // Reset des jeux
    resetDemoGames();

    // Reset des articles
    resetDemoArticles();

    // Reset des tests
    resetDemoTests();

    // Reset des bons plans
    resetDemoBonsPlans();

    // Reset des promos
    resetDemoPromos();

    // Reset des partenariats
    resetDemoPartners();

    const resetCounts = {
      games: getGamesData().length,
      actu: getArticlesData().filter((a) => a.category === "actu").length,
      guides: getArticlesData().filter((a) => a.category === "guide").length,
      tests: getTestsData().length,
      bonsPlans: getBonsPlansData().length,
      promos: getPromosData().length,
      partners: getPartnersData().length,
    };
    debugLog(
      "DEMO",
      `Demo content reset completed: ${JSON.stringify(resetCounts)}`,
    );
    updateAdminSiteCounters();
  } catch (error) {
    debugLog("DEMO", `Reset failed: ${error.message}`, "error");
  }
}

/**
 * Reset des jeux démo
 */
function resetDemoGames() {
  const games = getGamesData();
  const filtered = games.filter((game) => !game.demo);
  if (filtered.length !== games.length) {
    saveGamesOverride(filtered);
    debugLog(
      "DEMO",
      `Games: Removed ${games.length - filtered.length} demo games`,
    );
  }
}

/**
 * Reset des articles démo
 */
function resetDemoArticles() {
  const articles = getArticlesData();
  const filtered = articles.filter((article) => !article.demo);
  if (filtered.length !== articles.length) {
    saveArticlesOverride(filtered);
    debugLog(
      "DEMO",
      `Articles: Removed ${articles.length - filtered.length} demo articles`,
    );
  }
}

/**
 * Reset des tests démo
 */
function resetDemoTests() {
  const tests = getTestsData();
  const filtered = tests.filter((test) => !test.demo);
  if (filtered.length !== tests.length) {
    saveTestsOverride(filtered);
    debugLog(
      "DEMO",
      `Tests: Removed ${tests.length - filtered.length} demo tests`,
    );
  }
}

/**
 * Reset des bons plans démo
 */
function resetDemoBonsPlans() {
  const bonsPlans = getBonsPlansData();
  const filtered = bonsPlans.filter((bp) => !bp.demo);
  if (filtered.length !== bonsPlans.length) {
    saveBonsPlansOverride(filtered);
    debugLog(
      "DEMO",
      `Bons Plans: Removed ${bonsPlans.length - filtered.length} demo deals`,
    );
  }
}

/**
 * Reset des promos démo
 */
function resetDemoPromos() {
  const promos = getPromosData();
  const filtered = promos.filter((promo) => !promo.demo);
  if (filtered.length !== promos.length) {
    savePromosOverride(filtered);
    debugLog(
      "DEMO",
      `Promos: Removed ${promos.length - filtered.length} demo promos`,
    );
  }
}

/**
 * Reset des partenariats démo
 */
function resetDemoPartners() {
  const partners = getPartnersData();
  const filtered = partners.filter((partner) => !partner.demo);
  if (filtered.length !== partners.length) {
    savePartnersOverride(filtered);
    debugLog(
      "DEMO",
      `Partners: Removed ${partners.length - filtered.length} demo partners`,
    );
  }
}

/**
 * Mise à jour des compteurs du site dans l'admin
 */
// Fonction globale safe pour mettre à jour les compteurs du site
window.updateSiteStatus = function () {
  try {
    updateAdminSiteCounters();
  } catch (e) {
    console.error("Erreur dans updateSiteStatus:", e);
  }
};

function updateAdminSiteCounters() {
  const countersEl = document.getElementById("adminSiteCounters");
  if (!countersEl) return;

  // Calculer les vrais compteurs depuis les sources de vérité
  const counts = {
    games: getGamesData().length,
    actu: getArticlesData().filter((a) => a.category === "actu").length,
    guides: getArticlesData().filter((a) => a.category === "guide").length,
    tests: getTestsData().length,
    bonsPlans: getBonsPlansData().length,
    promos: getPromosData().length,
    partners: getPartnersData().length,
  };

  countersEl.innerHTML = `
        <div class="counters-grid">
            <div class="counter-badge">🎮 Jeux: ${counts.games}/99</div>
            <div class="counter-badge">📰 Actu: ${counts.actu}/99</div>
            <div class="counter-badge">📚 Guides: ${counts.guides}/99</div>
            <div class="counter-badge">🧪 Tests: ${counts.tests}/99</div>
            <div class="counter-badge">💰 Bons Plans: ${counts.bonsPlans}/99</div>
            <div class="counter-badge">🔥 Promos: ${counts.promos}/99</div>
            <div class="counter-badge">🤝 Partenaires: ${counts.partners}/99</div>
        </div>
    `;
}

/**
 * Fonction helper pour obtenir les partenariats (si elle n'existe pas)
 */
function getPartnersData() {
  const override = getPartnersOverride();
  return override || [];
}

function getPartnersOverride() {
  try {
    const stored = localStorage.getItem("team_override"); // Réutilise la clé équipe pour les partenariats
    const data = stored ? JSON.parse(stored) : [];
    return data.filter((item) => item.logo && item.website); // Filtre pour les partenariats
  } catch (e) {
    return [];
  }
}

function savePartnersOverride(data) {
  try {
    // Fusionne avec les données équipe existantes
    const existingTeam = getTeamData();
    const partnerships = data.filter((item) => item.logo && item.website);
    const teamMembers = existingTeam.filter(
      (item) => !item.logo || !item.website,
    );

    const merged = [...teamMembers, ...partnerships];
    localStorage.setItem("team_override", JSON.stringify(merged));
  } catch (e) {
    console.error("[savePartnersOverride] Erreur sauvegarde:", e);
  }
}

// ============================================
// SEED SYSTEM - Génération de contenu démo réaliste
// ============================================

/**
 * Données de seed réalistes pour les tests
 */
const SEED_DATA = {
  games: [
    {
      title: "The Legend of Zelda: Tears of the Kingdom",
      description:
        "Suite de Breath of the Wild avec de nouvelles mécaniques et un monde ouvert immense.",
      image:
        "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063780/9989957eae3a6b545194c42fec207aad5b2cc1043c8e4a4a6a646e47544b7b0fc",
      platforms: ["Switch"],
      genres: ["Action", "Aventure"],
      rating: 4.8,
    },
    {
      title: "Baldur's Gate 3",
      description:
        "RPG tactique basé sur D&D avec un système de combat au tour par tour révolutionnaire.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["RPG"],
      rating: 4.9,
    },
    {
      title: "Elden Ring",
      description:
        "Action-RPG ouvert créé par FromSoftware et George R.R. Martin.",
      image:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202107/1612/Y5RHNmzAtc6sRYwZlZWkgOWJ.png",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["Action", "RPG"],
      rating: 4.7,
    },
    {
      title: "God of War Ragnarök",
      description: "Suite épique de la série God of War avec Kratos et Atreus.",
      image:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0.png",
      platforms: ["PS5"],
      genres: ["Action", "Aventure"],
      rating: 4.8,
    },
    {
      title: "Spider-Man 2",
      description:
        "Nouvelle aventure de Spider-Man avec Peter Parker et Miles Morales.",
      image:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202306/1219/1c2d8c1c87ab30eca44e72dc8741cd5d24ea85a8cfdb2f95.png",
      platforms: ["PS5"],
      genres: ["Action", "Aventure"],
      rating: 4.6,
    },
    {
      title: "Resident Evil 4 Remake",
      description:
        "Remake du classique survival horror avec des graphismes modernes.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["Action", "Horreur"],
      rating: 4.5,
    },
    {
      title: "Cyberpunk 2077",
      description: "RPG futuriste dans un monde ouvert dystopique.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["RPG", "Action"],
      rating: 4.2,
    },
    {
      title: "Hogwarts Legacy",
      description: "RPG d'action dans l'univers Harry Potter.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["RPG", "Aventure"],
      rating: 4.4,
    },
    {
      title: "Starfield",
      description: "RPG spatial développé par Bethesda.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/capsule_616x353.jpg",
      platforms: ["PC", "Xbox Series X"],
      genres: ["RPG", "Simulation"],
      rating: 3.8,
    },
    {
      title: "The Sims 4",
      description: "Simulation de vie avec création de personnages et maisons.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1222670/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X"],
      genres: ["Simulation"],
      rating: 4.1,
    },
    {
      title: "Minecraft",
      description: "Jeu de sandbox créatif et survie.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/221100/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X", "Switch"],
      genres: ["Sandbox", "Survie"],
      rating: 4.6,
    },
    {
      title: "Among Us",
      description: "Jeu multijoueur de déduction sociale.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/945360/capsule_616x353.jpg",
      platforms: ["PC", "Mobile"],
      genres: ["Party", "Multiplayer"],
      rating: 4.0,
    },
    {
      title: "Fortnite",
      description: "Battle Royale avec construction et événements spéciaux.",
      image:
        "https://cdn2.unrealengine.com/fortnite-marketing-site/en-US/social-16x9.jpg",
      platforms: ["PC", "PS5", "Xbox Series X", "Mobile"],
      genres: ["Action", "Battle Royale"],
      rating: 3.9,
    },
    {
      title: "Rocket League",
      description: "Sport mécanique mélangeant football et voitures.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/252950/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X", "Switch"],
      genres: ["Sport", "Course"],
      rating: 4.3,
    },
    {
      title: "Stardew Valley",
      description: "Simulation agricole relaxante.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/413150/capsule_616x353.jpg",
      platforms: ["PC", "PS5", "Xbox Series X", "Switch", "Mobile"],
      genres: ["Simulation", "RPG"],
      rating: 4.7,
    },
    {
      title: "Hades",
      description: "Roguelike d'action avec une histoire captivante.",
      image:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/capsule_616x353.jpg",
      platforms: ["PC", "Switch"],
      genres: ["Action", "Roguelike"],
      rating: 4.8,
    },
  ],

  articles: {
    actu: [
      {
        title: "PlayStation Showcase 2024 : Les annonces majeures",
        excerpt:
          "Sony dévoile ses prochains hits avec Spider-Man 3, God of War Ragnarök Valhalla et bien d'autres surprises.",
        cover:
          "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202309/2702/52f0f5c0343b72b4bd6f5c6c3a2bb5c8a2e6b8c6.png",
        category: "actu",
        gameId: "spider-man-2",
      },
      {
        title: "Xbox Games Showcase : Une pluie d'annonces",
        excerpt:
          "Microsoft impressionne avec de nouveaux titres Starfield, Forza Motorsport et des exclusivités Game Pass.",
        cover:
          "https://news.xbox.com/en-us/wp-content/uploads/sites/2/2024/06/XboxGamesShowcase2024_KeyArt_1920x1080.jpg",
        category: "actu",
      },
      {
        title: "Nintendo Direct : Focus sur l'innovation",
        excerpt:
          "Nintendo présente de nouveaux jeux pour Switch et tease la future console portable.",
        cover:
          "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/en_US/articles/2024/nintendo-direct-6-18-2024/featured",
        category: "actu",
        gameId: "the-legend-of-zelda-tears-of-the-kingdom",
      },
      {
        title: "Steam Deck OLED : Une mise à jour réussie",
        excerpt:
          "Valve améliore sa console portable avec un écran OLED et une meilleure autonomie.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/clans/39049601/8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b.jpg",
        category: "actu",
      },
      {
        title: "Baldur's Gate 3 : Record de ventes battu",
        excerpt:
          "Le RPG de Larian Studios dépasse les 20 millions d'exemplaires vendus.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg",
        category: "actu",
        gameId: "baldurs-gate-3",
      },
      {
        title: "Elden Ring : Shadow of the Erdtree en développement",
        excerpt:
          "FromSoftware confirme l'extension majeure pour le jeu acclamé.",
        cover:
          "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202107/1612/Y5RHNmzAtc6sRYwZlZWkgOWJ.png",
        category: "actu",
        gameId: "elden-ring",
      },
      {
        title: "Cyberpunk 2077 : Phantom Liberty acclamé",
        excerpt:
          "L'extension de CD Projekt RED reçoit des critiques positives malgré les bugs initiaux.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/capsule_616x353.jpg",
        category: "actu",
        gameId: "cyberpunk-2077",
      },
      {
        title: "Hogwarts Legacy : Succès commercial confirmé",
        excerpt:
          "Le jeu Harry Potter dépasse les 25 millions de copies vendues.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/capsule_616x353.jpg",
        category: "actu",
        gameId: "hogwarts-legacy",
      },
      {
        title: "Industrie : Le gaming dépasse le cinéma au box-office",
        excerpt:
          "Les jeux vidéo génèrent plus de revenus que l'industrie cinématographique.",
        cover:
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200",
        category: "actu",
      },
      {
        title: "Metroid Prime 4 : Annoncé officiellement",
        excerpt:
          "Nintendo confirme enfin le développement du jeu tant attendu.",
        cover:
          "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063780/9989957eae3a6b545194c42fec207aad5b2cc1043c8e4a4a6a646e47544b7b0fc",
        category: "actu",
      },
      {
        title: "Steam : Nouveaux records de connexions",
        excerpt:
          "La plateforme bat ses records avec plus de 30 millions d'utilisateurs simultanés.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/store/home/store_home_share.jpg",
        category: "actu",
      },
      {
        title: "EA Sports FC 25 : Changement de nom officiel",
        excerpt:
          "Fifa devient EA Sports FC avec une nouvelle approche marketing.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/2669320/capsule_616x353.jpg",
        category: "actu",
      },
      {
        title: "Ubisoft : Nouveaux studios en développement",
        excerpt:
          "L'éditeur français annonce l'ouverture de studios en Suède et en Espagne.",
        cover:
          "https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy69uqbjxBSd33xIvvzf2K9Q/prismic/field/image/Z2V0SW5Ub3VjaFdpdGhHYW1pbmd8ZWFhZWJiNjMtODM3ZC00NzY4LWI2ZGYtNmM5MmM3ZmM2MzM2fGVhLWFzc2V0cy1pbWFnZS1oZWFkZXI=",
        category: "actu",
      },
    ],

    guides: [
      {
        title: "Guide complet Zelda : Tears of the Kingdom",
        excerpt:
          "Maîtrisez toutes les mécaniques et explorez chaque recoin du royaume d'Hyrule.",
        cover:
          "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063780/9989957eae3a6b545194c42fec207aad5b2cc1043c8e4a4a6a646e47544b7b0fc",
        category: "guide",
        gameId: "the-legend-of-zelda-tears-of-the-kingdom",
      },
      {
        title: "Builds optimaux Baldur's Gate 3",
        excerpt:
          "Les meilleures combinaisons de classes et de sorts pour dominer les combats.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg",
        category: "guide",
        gameId: "baldurs-gate-3",
      },
      {
        title: "Secrets cachés d'Elden Ring",
        excerpt:
          "Découvrez tous les boss optionnels et les zones secrètes du jeu.",
        cover:
          "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202107/1612/Y5RHNmzAtc6sRYwZlZWkgOWJ.png",
        category: "guide",
        gameId: "elden-ring",
      },
      {
        title: "Astuces God of War Ragnarök",
        excerpt:
          "Maximisez votre expérience avec ces conseils pour les combats et l'exploration.",
        cover:
          "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0.png",
        category: "guide",
        gameId: "god-of-war-ragnarok",
      },
      {
        title: "Routes optimisées Spider-Man 2",
        excerpt: "Parcourez Manhattan de la manière la plus efficace possible.",
        cover:
          "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202306/1219/1c2d8c1c87ab30eca44e72dc8741cd5d24ea85a8cfdb2f95.png",
        category: "guide",
        gameId: "spider-man-2",
      },
      {
        title: "Survie Resident Evil 4 Remake",
        excerpt: "Gérez vos ressources et survivez aux hordes de Ganado.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/capsule_616x353.jpg",
        category: "guide",
        gameId: "resident-evil-4-remake",
      },
      {
        title: "Exploration complète Cyberpunk 2077",
        excerpt:
          "Visitez tous les districts et complétez votre carte de Night City.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/capsule_616x353.jpg",
        category: "guide",
        gameId: "cyberpunk-2077",
      },
      {
        title: "Maisons magiques Hogwarts Legacy",
        excerpt:
          "Personnalisez votre demeure avec tous les secrets disponibles.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/capsule_616x353.jpg",
        category: "guide",
        gameId: "hogwarts-legacy",
      },
      {
        title: "Navigation spatiale Starfield",
        excerpt:
          "Maîtrisez les mécaniques de vol et d'exploration de l'espace.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/capsule_616x353.jpg",
        category: "guide",
        gameId: "starfield",
      },
      {
        title: "Création de personnages The Sims 4",
        excerpt: "Tous les traits et aspirations pour créer le sim parfait.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/1222670/capsule_616x353.jpg",
        category: "guide",
        gameId: "the-sims-4",
      },
      {
        title: "Constructions avancées Minecraft",
        excerpt: "Du simple abri à la base automatique, maîtrisez le crafting.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/221100/capsule_616x353.jpg",
        category: "guide",
        gameId: "minecraft",
      },
      {
        title: "Stratégies Among Us",
        excerpt: "Devenez le meilleur imposteur ou le détective ultime.",
        cover:
          "https://cdn.cloudflare.steamstatic.com/steam/apps/945360/capsule_616x353.jpg",
        category: "guide",
        gameId: "among-us",
      },
      {
        title: "Techniques avancées Fortnite",
        excerpt: "Maîtrisez le building et les armes pour dominer les parties.",
        cover:
          "https://cdn2.unrealengine.com/fortnite-marketing-site/en-US/social-16x9.jpg",
        category: "guide",
        gameId: "fortnite",
      },
    ],
  },

  tests: [
    {
      title: "Test complet Zelda : Tears of the Kingdom",
      excerpt:
        "Une suite exceptionnelle qui élève encore plus haut la barre de l'open-world.",
      content:
        "Zelda : Tears of the Kingdom est tout simplement exceptionnel...",
      coverUrl:
        "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063780/9989957eae3a6b545194c42fec207aad5b2cc1043c8e4a4a6a646e47544b7b0fc",
      gameId: "the-legend-of-zelda-tears-of-the-kingdom",
      score: 9.5,
      criteria: [
        { label: "Gameplay", score: 9.8 },
        { label: "Direction artistique", score: 9.7 },
        { label: "Durée de vie", score: 9.6 },
        { label: "Innovation", score: 10 },
        { label: "Narration", score: 8.5 },
      ],
      publishedAt: "2024-01-15T10:00:00Z",
    },
    {
      title: "Avis Baldur's Gate 3 : Le RPG ultime",
      excerpt: "Un chef-d'œuvre tactique qui redéfinit le genre RPG moderne.",
      content:
        "Baldur's Gate 3 est le jeu que tout amateur de RPG attendait...",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg",
      gameId: "baldurs-gate-3",
      score: 9.7,
      criteria: [
        { label: "Système de combat", score: 9.9 },
        { label: "Narration", score: 9.8 },
        { label: "Liberté d'action", score: 9.5 },
        { label: "Rejouabilité", score: 9.6 },
        { label: "Interface", score: 9.2 },
      ],
      publishedAt: "2024-01-10T14:30:00Z",
    },
    {
      title: "Test Elden Ring : Un monument du gaming",
      excerpt:
        "Difficile mais juste, FromSoftware livre une expérience inoubliable.",
      content: "Elden Ring représente l'apogée du travail de FromSoftware...",
      coverUrl:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202107/1612/Y5RHNmzAtc6sRYwZlZWkgOWJ.png",
      gameId: "elden-ring",
      score: 9.3,
      criteria: [
        { label: "Difficulté", score: 9.8 },
        { label: "Direction artistique", score: 9.5 },
        { label: "Gameplay", score: 9.2 },
        { label: "Durée de vie", score: 9.4 },
        { label: "Immersion", score: 9.0 },
      ],
      publishedAt: "2024-01-05T09:15:00Z",
    },
    {
      title: "Critique God of War Ragnarök",
      excerpt: "Une conclusion épique à la saga de Kratos et Atreus.",
      content:
        "God of War Ragnarök achève magnifiquement la nouvelle trilogie...",
      coverUrl:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0.png",
      gameId: "god-of-war-ragnarok",
      score: 9.2,
      criteria: [
        { label: "Narration", score: 9.8 },
        { label: "Gameplay", score: 9.3 },
        { label: "Direction artistique", score: 9.4 },
        { label: "Bande-son", score: 9.5 },
        { label: "Durée de vie", score: 8.5 },
      ],
      publishedAt: "2024-01-01T16:45:00Z",
    },
    {
      title: "Avis Spider-Man 2 : Un retour réussi",
      excerpt:
        "Marvel's Spider-Man 2 confirme l'excellence de la série sur PS5.",
      content:
        "Après un premier volet déjà excellent, Spider-Man 2 élève encore la barre...",
      coverUrl:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202306/1219/1c2d8c1c87ab30eca44e72dc8741cd5d24ea85a8cfdb2f95.png",
      gameId: "spider-man-2",
      score: 8.9,
      criteria: [
        { label: "Gameplay", score: 9.2 },
        { label: "Narration", score: 8.8 },
        { label: "Direction artistique", score: 9.0 },
        { label: "Technologie", score: 9.4 },
        { label: "Durée de vie", score: 8.5 },
      ],
      publishedAt: "2023-12-28T11:20:00Z",
    },
    {
      title: "Test Resident Evil 4 Remake",
      excerpt:
        "Un survival horror moderne qui respecte ses origines tout en innovant.",
      content: "Capcom a parfaitement réussi son pari avec ce remake...",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/capsule_616x353.jpg",
      gameId: "resident-evil-4-remake",
      score: 9.0,
      criteria: [
        { label: "Atmosphère", score: 9.5 },
        { label: "Gameplay", score: 9.2 },
        { label: "Technologie", score: 8.8 },
        { label: "Durée de vie", score: 8.9 },
        { label: "Rejouabilité", score: 8.8 },
      ],
      publishedAt: "2023-12-20T13:10:00Z",
    },
    {
      title: "Critique Cyberpunk 2077 : Phantom Liberty",
      excerpt: "L'extension rachète les défauts du jeu de base.",
      content:
        "Phantom Liberty transforme Cyberpunk 2077 en l'expérience qu'il aurait dû être...",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/capsule_616x353.jpg",
      gameId: "cyberpunk-2077",
      score: 8.5,
      criteria: [
        { label: "Contenu", score: 9.0 },
        { label: "Narration", score: 8.8 },
        { label: "Gameplay", score: 8.5 },
        { label: "Durée de vie", score: 9.2 },
        { label: "Prix", score: 7.5 },
      ],
      publishedAt: "2023-12-15T15:30:00Z",
    },
    {
      title: "Test Hogwarts Legacy",
      excerpt: "Un RPG magique qui ravira les fans d'Harry Potter.",
      content:
        "Avalanche Software livre une adaptation réussie de l'univers Harry Potter...",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/capsule_616x353.jpg",
      gameId: "hogwarts-legacy",
      score: 8.7,
      criteria: [
        { label: "Immersion", score: 9.5 },
        { label: "Gameplay", score: 8.8 },
        { label: "Direction artistique", score: 9.2 },
        { label: "Contenu", score: 8.5 },
        { label: "Bugs", score: 7.8 },
      ],
      publishedAt: "2023-12-10T12:00:00Z",
    },
    {
      title: "Avis Starfield : Ambitieux mais perfectible",
      excerpt: "Bethesda explore l'espace avec un RPG ambitieux mais inachevé.",
      content: "Starfield représente un énorme pas en avant pour Bethesda...",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/capsule_616x353.jpg",
      gameId: "starfield",
      score: 7.5,
      criteria: [
        { label: "Ambition", score: 9.0 },
        { label: "Direction artistique", score: 8.5 },
        { label: "Gameplay", score: 7.8 },
        { label: "Contenu", score: 7.2 },
        { label: "Performance", score: 6.8 },
      ],
      publishedAt: "2023-12-05T10:45:00Z",
    },
    {
      title: "Test The Sims 4 : Cottage Living",
      excerpt:
        "Une extension agricole qui apporte fraîcheur à la simulation de vie.",
      content: "Cottage Living ramène The Sims 4 à ses racines agricoles...",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1222670/capsule_616x353.jpg",
      gameId: "the-sims-4",
      score: 8.2,
      criteria: [
        { label: "Nouveautés", score: 8.8 },
        { label: "Gameplay", score: 8.5 },
        { label: "Graphismes", score: 8.0 },
        { label: "Durée de vie", score: 8.2 },
        { label: "Prix", score: 7.8 },
      ],
      publishedAt: "2023-12-01T14:20:00Z",
    },
    {
      title: "Critique Minecraft : Timeless Classic",
      excerpt: "Un jeu qui ne vieillit pas et continue d'innover.",
      content: "Vingt ans après sa sortie, Minecraft reste une référence...",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/221100/capsule_616x353.jpg",
      gameId: "minecraft",
      score: 9.8,
      criteria: [
        { label: "Créativité", score: 10 },
        { label: "Durée de vie", score: 10 },
        { label: "Communauté", score: 9.5 },
        { label: "Accessibilité", score: 9.8 },
        { label: "Innovation", score: 9.6 },
      ],
      publishedAt: "2023-11-25T09:30:00Z",
    },
    {
      title: "Test Among Us : Social Deduction Master",
      excerpt: "Un jeu simple mais addictif qui divise les amis.",
      content: "Among Us a révolutionné le gaming mobile et multijoueur...",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/945360/capsule_616x353.jpg",
      gameId: "among-us",
      score: 8.5,
      criteria: [
        { label: "Gameplay", score: 9.0 },
        { label: "Addictivité", score: 8.8 },
        { label: "Social", score: 9.5 },
        { label: "Prix", score: 8.0 },
        { label: "Rejouabilité", score: 7.5 },
      ],
      publishedAt: "2023-11-20T16:15:00Z",
    },
    {
      title: "Avis Fortnite : Battle Royale Evolution",
      excerpt: "Epic Games continue d'innover malgré la saturation du marché.",
      content: "Fortnite a transcendé le simple battle royale...",
      coverUrl:
        "https://cdn2.unrealengine.com/fortnite-marketing-site/en-US/social-16x9.jpg",
      gameId: "fortnite",
      score: 8.0,
      criteria: [
        { label: "Innovation", score: 9.5 },
        { label: "Communauté", score: 8.5 },
        { label: "Gameplay", score: 8.2 },
        { label: "Monétisation", score: 6.5 },
        { label: "Performance", score: 8.0 },
      ],
      publishedAt: "2023-11-15T11:00:00Z",
    },
  ],

  bonsPlans: [
    {
      title: "God of War Ragnarök -60% sur Steam",
      excerpt:
        "Profitez de la meilleure réduction actuelle sur le jeu de l'année 2022.",
      coverUrl:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0.png",
      externalUrl:
        "https://store.steampowered.com/app/2344520/God_of_War_Ragnark/",
      merchant: "Steam",
      price: 39.99,
      oldPrice: 99.99,
      discountPercent: 60,
      publishedAt: "2024-01-20T08:00:00Z",
      isFeatured: true,
    },
    {
      title: "Baldur's Gate 3 à prix réduit",
      excerpt: "Le RPG de l'année disponible avec une remise exceptionnelle.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/1086940/Baldurs_Gate_3/",
      merchant: "Steam",
      price: 44.99,
      oldPrice: 59.99,
      discountPercent: 25,
      publishedAt: "2024-01-18T10:30:00Z",
      isFeatured: true,
    },
    {
      title: "Elden Ring - Edition Deluxe",
      excerpt: "L'expérience complète avec tous les DLC à prix réduit.",
      coverUrl:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202107/1612/Y5RHNmzAtc6sRYwZlZWkgOWJ.png",
      externalUrl: "https://store.steampowered.com/app/1245620/ELDEN_RING/",
      merchant: "Steam",
      price: 35.99,
      oldPrice: 49.99,
      discountPercent: 28,
      publishedAt: "2024-01-16T14:15:00Z",
      isFeatured: false,
    },
    {
      title: "Spider-Man 2 PS5 - Meilleur prix",
      excerpt: "L'exclusivité PS5 proposée au tarif le plus bas du marché.",
      coverUrl:
        "https://cdn.akamai.steamstatic.com/vulcan/ap/rnd/202306/1219/1c2d8c1c87ab30eca44e72dc8741cd5d24ea85a8cfdb2f95.png",
      externalUrl: "https://www.amazon.fr/dp/B0C8VH2H8L",
      merchant: "Amazon",
      price: 59.99,
      oldPrice: 79.99,
      discountPercent: 25,
      publishedAt: "2024-01-14T12:45:00Z",
      isFeatured: true,
    },
    {
      title: "Cyberpunk 2077 + Phantom Liberty",
      excerpt: "Le jeu complet avec son extension à prix réduit.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/1091500/Cyberpunk_2077/",
      merchant: "Steam",
      price: 29.99,
      oldPrice: 39.99,
      discountPercent: 25,
      publishedAt: "2024-01-12T09:20:00Z",
      isFeatured: false,
    },
    {
      title: "Hogwarts Legacy - Édition Complète",
      excerpt: "Tous les DLC inclus avec une belle réduction.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/990080/Hogwarts_Legacy/",
      merchant: "Steam",
      price: 39.99,
      oldPrice: 59.99,
      discountPercent: 33,
      publishedAt: "2024-01-10T16:30:00Z",
      isFeatured: true,
    },
    {
      title: "Resident Evil 4 Remake - Offre limitée",
      excerpt: "Le remake tant attendu à prix cassé.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/capsule_616x353.jpg",
      externalUrl:
        "https://store.steampowered.com/app/2050650/Resident_Evil_4/",
      merchant: "Steam",
      price: 49.99,
      oldPrice: 59.99,
      discountPercent: 17,
      publishedAt: "2024-01-08T11:10:00Z",
      isFeatured: false,
    },
    {
      title: "Zelda : Tears of the Kingdom - Bundle",
      excerpt: "Le jeu + la console Nintendo Switch OLED.",
      coverUrl:
        "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063780/9989957eae3a6b545194c42fec207aad5b2cc1043c8e4a4a6a646e47544b7b0fc",
      externalUrl: "https://www.amazon.fr/dp/B0C8VH2H8L",
      merchant: "Amazon",
      price: 299.99,
      oldPrice: 349.99,
      discountPercent: 14,
      publishedAt: "2024-01-06T13:25:00Z",
      isFeatured: true,
    },
    {
      title: "Starfield - Édition Premium",
      excerpt: "Toutes les extensions incluses à prix réduit.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/1716740/Starfield/",
      merchant: "Steam",
      price: 54.99,
      oldPrice: 69.99,
      discountPercent: 21,
      publishedAt: "2024-01-04T15:40:00Z",
      isFeatured: false,
    },
    {
      title: "The Sims 4 - Pack Complet",
      excerpt: "Tous les DLC et packs de jeu à prix réduit.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/1222670/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/1222670/The_Sims_4/",
      merchant: "Steam",
      price: 19.99,
      oldPrice: 39.99,
      discountPercent: 50,
      publishedAt: "2024-01-02T10:55:00Z",
      isFeatured: false,
    },
    {
      title: "Minecraft - Édition Legacy",
      excerpt: "Le jeu classique avec tous les anciens contenus.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/221100/capsule_616x353.jpg",
      externalUrl:
        "https://www.minecraft.net/fr-fr/store/minecraft-java-edition",
      merchant: "Mojang",
      price: 26.95,
      oldPrice: 29.99,
      discountPercent: 10,
      publishedAt: "2023-12-30T12:15:00Z",
      isFeatured: true,
    },
    {
      title: "Among Us - Bundle Social",
      excerpt: "Le jeu + tous les cosmétiques et skins spéciaux.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/945360/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/945360/Among_Us/",
      merchant: "Steam",
      price: 3.99,
      oldPrice: 4.99,
      discountPercent: 20,
      publishedAt: "2023-12-28T14:20:00Z",
      isFeatured: false,
    },
    {
      title: "Fortnite - Battle Pass Saison",
      excerpt: "Accès anticipé au nouveau Battle Pass avec 30% de réduction.",
      coverUrl:
        "https://cdn2.unrealengine.com/fortnite-marketing-site/en-US/social-16x9.jpg",
      externalUrl: "https://www.epicgames.com/store/fr/p/fortnite",
      merchant: "Epic Games",
      price: 9.79,
      oldPrice: 13.99,
      discountPercent: 30,
      publishedAt: "2023-12-26T16:35:00Z",
      isFeatured: true,
    },
    {
      title: "Rocket League - Édition Deluxe",
      excerpt: "Tous les DLC et voitures premium à prix réduit.",
      coverUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/252950/capsule_616x353.jpg",
      externalUrl: "https://store.steampowered.com/app/252950/Rocket_League/",
      merchant: "Steam",
      price: 15.99,
      oldPrice: 19.99,
      discountPercent: 20,
      publishedAt: "2023-12-24T09:45:00Z",
      isFeatured: false,
    },
  ],
};

/**
 * Fonction principale de seed du contenu démo
 */
function seedDemoContent() {
  debugLog("SEED", "Starting demo content seeding...");

  try {
    // Seed des jeux
    seedGames();

    // Seed des articles
    seedArticles();

    // Seed des tests
    seedTests();

    // Seed des bons plans
    seedBonsPlans();

    // Seed des promos (simulé)
    seedPromos();

    // Seed des partenariats (simulé)
    seedPartners();

    debugLog("SEED", "Demo content seeding completed successfully");

    // Audit automatique
    performAudit();
  } catch (error) {
    debugLog("SEED", `Seeding failed: ${error.message}`, "error");
  }
}

/**
 * Seed des jeux (arriver à ~20 jeux)
 */
function seedGames() {
  const existingGames = getGamesData();
  const targetCount = 20;
  const toAdd = Math.max(0, targetCount - existingGames.length);

  if (toAdd === 0) {
    debugLog(
      "SEED",
      `Games: Already have ${existingGames.length}/${targetCount}`,
    );
    return;
  }

  const gamesToAdd = SEED_DATA.games.slice(0, toAdd);
  const gamesWithIds = gamesToAdd.map((game) => ({
    ...game,
    id: generateId(existingGames, slugify(game.title)),
    slug: slugify(game.title),
  }));

  // Sauvegarder
  const allGames = [...existingGames, ...gamesWithIds];
  saveGamesOverride(allGames);

  window.debugState.seeded.games = gamesToAdd.length;
  debugLog(
    "SEED",
    `Games: Added ${gamesToAdd.length} games (total: ${allGames.length})`,
  );
}

/**
 * Seed des articles (arriver à 13 actu + 13 guides)
 */
function seedArticles() {
  const existingArticles = getArticlesData();
  const actuExisting = existingArticles.filter(
    (a) => a.category === "actu",
  ).length;
  const guidesExisting = existingArticles.filter(
    (a) => a.category === "guide",
  ).length;

  const actuToAdd = Math.max(0, 13 - actuExisting);
  const guidesToAdd = Math.max(0, 13 - guidesExisting);

  let addedArticles = 0;

  // Seed actu
  if (actuToAdd > 0) {
    const actuToSeed = SEED_DATA.articles.actu
      .slice(0, actuToAdd)
      .map((article) => ({
        ...article,
        id: generateId(existingArticles, slugify(article.title)),
        slug: slugify(article.title),
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contentBlocks: [
          {
            type: "text",
            text: `Article complet sur ${article.title}. ${article.excerpt}`,
            blockId: `block-${Date.now()}-1`,
          },
        ],
      }));

    addedArticles += actuToSeed.length;
    window.debugState.seeded.actu = actuToSeed.length;
  }

  // Seed guides
  if (guidesToAdd > 0) {
    const guidesToSeed = SEED_DATA.articles.guides
      .slice(0, guidesToAdd)
      .map((article) => ({
        ...article,
        id: generateId(existingArticles, slugify(article.title)),
        slug: slugify(article.title),
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contentBlocks: [
          {
            type: "text",
            text: `Guide complet pour ${article.title}. ${article.excerpt}`,
            blockId: `block-${Date.now()}-1`,
          },
        ],
      }));

    addedArticles += guidesToSeed.length;
    window.debugState.seeded.guides = guidesToSeed.length;
  }

  if (addedArticles > 0) {
    const allArticles = [...existingArticles, ...actuToSeed, ...guidesToSeed];
    saveArticlesOverride(allArticles);
    debugLog(
      "SEED",
      `Articles: Added ${addedArticles} articles (${actuToSeed.length} actu + ${guidesToSeed.length} guides)`,
    );
  } else {
    debugLog(
      "SEED",
      `Articles: Already have sufficient content (${actuExisting} actu + ${guidesExisting} guides)`,
    );
  }
}

/**
 * Seed des tests (arriver à 13 tests)
 */
function seedTests() {
  const existingTests = getTestsData();
  const targetCount = 13;
  const toAdd = Math.max(0, targetCount - existingTests.length);

  if (toAdd === 0) {
    debugLog(
      "SEED",
      `Tests: Already have ${existingTests.length}/${targetCount}`,
    );
    return;
  }

  const testsToAdd = SEED_DATA.tests.slice(0, toAdd).map((test) => ({
    ...test,
    id: generateId(existingTests, slugify(test.title)),
    slug: slugify(test.title),
    publishedAt: test.publishedAt || new Date().toISOString(),
    contentBlocks: [
      {
        type: "text",
        text: test.content,
        blockId: `block-${Date.now()}-1`,
      },
    ],
  }));

  const allTests = [...existingTests, ...testsToAdd];
  saveTestsOverride(allTests);

  window.debugState.seeded.tests = testsToAdd.length;
  debugLog(
    "SEED",
    `Tests: Added ${testsToAdd.length} tests (total: ${allTests.length})`,
  );
}

/**
 * Seed des bons plans (arriver à 13 bons plans)
 */
function seedBonsPlans() {
  const existingBonsPlans = getBonsPlansData();
  const targetCount = 13;
  const toAdd = Math.max(0, targetCount - existingBonsPlans.length);

  if (toAdd === 0) {
    debugLog(
      "SEED",
      `Bons Plans: Already have ${existingBonsPlans.length}/${targetCount}`,
    );
    return;
  }

  const bonsPlansToAdd = SEED_DATA.bonsPlans.slice(0, toAdd).map((bonPlan) => ({
    ...bonPlan,
    id: generateId(existingBonsPlans, slugify(bonPlan.title)),
    slug: slugify(bonPlan.title),
    publishedAt: bonPlan.publishedAt || new Date().toISOString(),
    contentBlocks: [
      {
        type: "text",
        text: `Offre exceptionnelle : ${bonPlan.excerpt}`,
        blockId: `block-${Date.now()}-1`,
      },
    ],
  }));

  const allBonsPlans = [...existingBonsPlans, ...bonsPlansToAdd];
  saveBonsPlansOverride(allBonsPlans);

  window.debugState.seeded.bonsPlans = bonsPlansToAdd.length;
  debugLog(
    "SEED",
    `Bons Plans: Added ${bonsPlansToAdd.length} deals (total: ${allBonsPlans.length})`,
  );
}

/**
 * Seed simulé des promos (8-12 éléments)
 */
function seedPromos() {
  // Pour les promos, on simule juste qu'on en a ajouté
  const existingCount = getPromosData().length;
  const targetCount = 10;
  const simulatedAdd = Math.max(0, targetCount - existingCount);

  if (simulatedAdd > 0) {
    window.debugState.seeded.promos = simulatedAdd;
    debugLog(
      "SEED",
      `Promos: Simulated ${simulatedAdd} promos (sidebar feature)`,
    );
  }
}

/**
 * Seed simulé des partenariats (8-12 éléments)
 */
function seedPartners() {
  // Pour les partenariats, on simule juste qu'on en a ajouté
  const existingCount = getPartnersData().length;
  const targetCount = 10;
  const simulatedAdd = Math.max(0, targetCount - existingCount);

  if (simulatedAdd > 0) {
    window.debugState.seeded.partners = simulatedAdd;
    debugLog(
      "SEED",
      `Partners: Simulated ${simulatedAdd} partnerships (footer carousel)`,
    );
  }
}

/**
 * Audit automatique du site
 */
function performAudit() {
  debugLog("AUDIT", "Starting comprehensive audit...");

  const auditResults = {
    articles: [],
    games: [],
    tests: [],
    bonsPlans: [],
    routing: [],
    images: [],
  };

  // Audit des articles
  const articles = getArticlesData();
  articles.forEach((article) => {
    // Vérifier les liens externes
    if (article.externalUrl && !article.externalUrl.startsWith("http")) {
      auditResults.articles.push(
        `Article "${article.title}": invalid external URL`,
      );
    }

    // Vérifier les images
    if (!article.cover || !article.cover.startsWith("http")) {
      auditResults.articles.push(
        `Article "${article.title}": missing or invalid cover image`,
      );
    }

    // Vérifier les slugs dupliqués
    const duplicates = articles.filter(
      (a) => a.slug === article.slug && a.id !== article.id,
    );
    if (duplicates.length > 0) {
      auditResults.articles.push(
        `Article "${article.title}": duplicate slug "${article.slug}"`,
      );
    }
  });

  // Audit des jeux
  const games = getGamesData();
  games.forEach((game) => {
    if (!game.image || !game.image.startsWith("http")) {
      auditResults.games.push(`Game "${game.title}": missing or invalid image`);
    }

    if (!game.platforms || game.platforms.length === 0) {
      auditResults.games.push(`Game "${game.title}": no platforms specified`);
    }
  });

  // Audit des tests
  const tests = getTestsData();
  tests.forEach((test) => {
    if (!test.gameId) {
      auditResults.tests.push(`Test "${test.title}": no associated game`);
    } else {
      const game = games.find((g) => g.id === test.gameId);
      if (!game) {
        auditResults.tests.push(
          `Test "${test.title}": references non-existent game "${test.gameId}"`,
        );
      }
    }

    if (!test.coverUrl || !test.coverUrl.startsWith("http")) {
      auditResults.tests.push(`Test "${test.title}": missing or invalid cover`);
    }
  });

  // Audit des bons plans
  const bonsPlans = getBonsPlansData();
  bonsPlans.forEach((bonPlan) => {
    if (!bonPlan.externalUrl || !bonPlan.externalUrl.startsWith("http")) {
      auditResults.bonsPlans.push(
        `Bon plan "${bonPlan.title}": missing or invalid external URL`,
      );
    }

    if (!bonPlan.coverUrl || !bonPlan.coverUrl.startsWith("http")) {
      auditResults.bonsPlans.push(
        `Bon plan "${bonPlan.title}": missing or invalid cover`,
      );
    }
  });

  window.debugState.auditResults = auditResults;
  debugLog(
    "AUDIT",
    `Audit completed: ${Object.values(auditResults).flat().length} issues found`,
  );
  updateDebugPanel();
}

// ============================================
// INITIALISATION DEBUG
// ============================================

// Initialiser le système de debug au chargement
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setupErrorCapturing();
    diagnoseLayout();
    diagnoseData();
  });
} else {
  setupErrorCapturing();
  diagnoseLayout();
  diagnoseData();
}

/**
 * Vérifie si le mode debug est activé
 */
function isDebug() {
  const urlParams = new URLSearchParams(window.location.search);
  const hasUrlDebug = urlParams.get("debug") === "1";
  const hasLocalStorageDebug = localStorage.getItem("lmdl_debug") === "1";
  return hasUrlDebug || hasLocalStorageDebug;
}

/**
 * Log debug avec buffer et console (version bulletproof)
 */
if (!window.debugLog) {
  window.debugLog = function debugLog(scope, data, level = "info") {
    if (!isDebug()) return;

    const timestamp = new Date().toISOString().substring(11, 19);
    const message = `[${timestamp}] [${scope}] ${typeof data === "object" ? JSON.stringify(data, null, 2) : data}`;

    // Afficher différemment selon le niveau
    if (level === "error") {
      console.error(message);
    } else {
      console.log(message);
    }

    // Buffer pour overlay
    if (!window.debugBuffer) window.debugBuffer = [];
    window.debugBuffer.push({ scope, data, timestamp, level });

    // Garder seulement les 50 derniers messages
    if (window.debugBuffer.length > 50) {
      window.debugBuffer = window.debugBuffer.slice(-50);
    }

    updateDebugOverlay();
  };
}

/**
 * Met à jour l'overlay de debug
 */
function updateDebugOverlay() {
  if (!isDebug()) return;

  let overlay = document.getElementById("debug-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "debug-overlay";
    overlay.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 350px;
            max-height: 400px;
            background: rgba(0, 0, 0, 0.95);
            color: #fff;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            border: 1px solid #333;
            border-radius: 8px;
            z-index: 10000;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

    // Header
    const header = document.createElement("div");
    header.style.cssText = `
            background: #1a1a1a;
            padding: 8px 12px;
            border-bottom: 1px solid #333;
            font-weight: bold;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
    header.innerHTML = `
            <span>🔍 DEBUG MODE</span>
            <button onclick="toggleDebugOverlay()" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 14px;">−</button>
        `;

    // Content
    const content = document.createElement("div");
    content.id = "debug-content";
    content.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 8px 12px;
            max-height: 350px;
        `;

    overlay.appendChild(header);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Make draggable
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = overlay.offsetLeft;
      startTop = overlay.offsetTop;
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      overlay.style.left = startLeft + dx + "px";
      overlay.style.top = startTop + dy + "px";
      overlay.style.right = "auto";
      overlay.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  const content = overlay.querySelector("#debug-content");
  if (content && window.debugBuffer) {
    content.innerHTML = window.debugBuffer
      .map(
        (entry) => `
            <div style="margin-bottom: 4px; border-left: 2px solid ${
              entry.scope === "LAYOUT"
                ? "#4ade80"
                : entry.scope === "DATA"
                  ? "#fbbf24"
                  : entry.scope === "ERROR"
                    ? "#ef4444"
                    : "#666"
            }; padding-left: 6px;">
                <div style="color: #aaa; font-size: 9px;">[${entry.timestamp}] ${entry.scope}</div>
                <div style="white-space: pre-wrap; word-break: break-word;">${typeof entry.data === "object" ? JSON.stringify(entry.data, null, 2) : entry.data}</div>
            </div>
        `,
      )
      .join("");
    content.scrollTop = content.scrollHeight;
  }
}

/**
 * Bascule la visibilité de l'overlay debug
 */
function toggleDebugOverlay() {
  const overlay = document.getElementById("debug-overlay");
  if (overlay) {
    overlay.style.display = overlay.style.display === "none" ? "flex" : "none";
  }
}

/**
 * Diagnostique le layout de la page actuelle
 */
function diagnoseLayout() {
  if (!isDebug()) return;

  const pageKey = document.body.dataset.page || "unknown";

  // Détecter les éléments de layout
  const layoutElements = {
    container: document.querySelector(".container"),
    pageLayout: document.querySelector(".page-layout"),
    sidebarLeft: document.querySelector(".page-sidebar-left"),
    main: document.querySelector(".page-main"),
    sidebarRight: document.querySelector(".page-sidebar-right"),
    contentGrid: document.querySelector(".content-grid"),
    premiumPanel: document.querySelector(".premium-panel"),
  };

  // Computed styles
  const layoutInfo = {};
  Object.keys(layoutElements).forEach((key) => {
    const el = layoutElements[key];
    if (el) {
      const computed = window.getComputedStyle(el);
      layoutInfo[key] = {
        exists: true,
        classes: el.className,
        display: computed.display,
        width: computed.width,
        maxWidth: computed.maxWidth,
        gridTemplateColumns: computed.gridTemplateColumns,
        actualWidth: el.getBoundingClientRect().width,
      };
    } else {
      layoutInfo[key] = { exists: false };
    }
  });

  debugLog("LAYOUT", {
    page: pageKey,
    layout: layoutInfo,
    warnings: [],
  });

  // Vérifications spécifiques
  const warnings = [];

  if (!layoutElements.pageLayout) {
    warnings.push("Wrapper .page-layout manquant");
  }

  if (!layoutElements.sidebarLeft) {
    warnings.push("Sidebar gauche manquante");
  }

  if (!layoutElements.main) {
    warnings.push("Zone main manquante");
  }

  if (!layoutElements.sidebarRight) {
    warnings.push("Sidebar droite manquante");
  }

  if (warnings.length > 0) {
    debugLog("LAYOUT", { warnings });
  }
}

/**
 * Diagnostique les données chargées
 */
function diagnoseData() {
  if (!isDebug()) return;

  const dataInfo = {
    games: window.GAMES ? window.GAMES.length : 0,
    articles: window.ARTICLES ? window.ARTICLES.length : 0,
    tests: window.TESTS ? window.TESTS.length : 0,
    bonsPlans:
      window.DEALS || window.BONS_PLANS
        ? (window.DEALS || window.BONS_PLANS).length
        : 0,
    promos: window.PROMOS ? window.PROMOS.length : 0,
    sponsors: window.SPONSORS ? window.SPONSORS.length : 0,
    team: window.TEAM ? window.TEAM.members?.length || 0 : 0,
    media: window.MEDIA ? window.MEDIA.length : 0,
  };

  debugLog("DATA", {
    baseData: dataInfo,
    overrides: {
      games: localStorage.getItem("lmdl_games_v1") ? "present" : "none",
      articles: localStorage.getItem("lermite_articles_override")
        ? "present"
        : "none",
      tests: localStorage.getItem("lermite_tests_override")
        ? "present"
        : "none",
      bonsPlans: localStorage.getItem("lermite_bonsplans_override")
        ? "present"
        : "none",
      promos: localStorage.getItem("lermite_promos_override")
        ? "present"
        : "none",
      sponsors: localStorage.getItem("lermite_sponsors_override")
        ? "present"
        : "none",
      team: localStorage.getItem("lermite_team_override") ? "present" : "none",
      media: localStorage.getItem("lermite_media") ? "present" : "none",
    },
  });
}

// ============================================
// TESTS - Gestion des blocs (système comme articles)
// ============================================

// ============================================
// BONS PLANS - Gestion des blocs (système comme articles)
// ============================================

let bonPlanBlocks = [];

/**
 * Synchronise bonPlanBlocks depuis le DOM (préserve les valeurs saisies)
 */
function syncBonPlanBlocksFromDOM() {
  const blocksList = document.getElementById("bon-plan-blocks-list");
  if (!blocksList) return;

  const syncedBlocks = [];
  const blockElements = blocksList.querySelectorAll(".bon-plan-block-item");

  blockElements.forEach((blockEl, index) => {
    const blockId = blockEl.dataset.blockId;
    if (!blockId) return;

    const blockType = blockEl.dataset.blockType;
    let blockData = { type: blockType, blockId };

    if (blockType === "text") {
      const textarea = blockEl.querySelector('[data-block-field="text"]');
      if (textarea) {
        blockData.text = textarea.value.trim();
      }
    } else if (blockType === "heading") {
      const select = blockEl.querySelector('[data-block-field="level"]');
      const textarea = blockEl.querySelector('[data-block-field="text"]');
      if (select && textarea) {
        blockData.level = select.value;
        blockData.text = textarea.value.trim();
      }
    } else if (blockType === "image") {
      const input = blockEl.querySelector('[data-block-field="url"]');
      const altInput = blockEl.querySelector('[data-block-field="alt"]');
      if (input) {
        blockData.url = input.value.trim();
        blockData.src = input.value.trim(); // Pour compatibilité
        if (altInput) {
          blockData.alt = altInput.value.trim();
        }
      }
    } else if (blockType === "youtube") {
      const input = blockEl.querySelector('[data-block-field="url"]');
      if (input) {
        blockData.url = input.value.trim();
      }
    } else if (blockType === "offer") {
      const titleInput = blockEl.querySelector('[data-block-field="title"]');
      const urlInput = blockEl.querySelector('[data-block-field="url"]');
      const textInput = blockEl.querySelector('[data-block-field="text"]');
      if (titleInput && urlInput && textInput) {
        blockData.title = titleInput.value.trim();
        blockData.url = urlInput.value.trim();
        blockData.text = textInput.value.trim();
      }
    }

    syncedBlocks.push(blockData);
  });

  bonPlanBlocks = syncedBlocks;
  debugLog("BONPLAN", { blocksSynced: bonPlanBlocks.length });
}

/**
 * Lit les blocs depuis l'état bonPlanBlocks (après synchronisation depuis le DOM)
 */
function readBonPlanBlocks() {
  return bonPlanBlocks.map((block) => ({ ...block }));
}

/**
 * Crée un élément DOM pour un bloc de bon plan
 */
function createBonPlanBlockElement(block, index) {
  const blockEl = document.createElement("div");
  blockEl.className = "bon-plan-block-item";
  blockEl.dataset.blockType = block.type;
  blockEl.dataset.blockIndex = index;
  blockEl.dataset.blockId =
    block.blockId ||
    `block-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
  blockEl.style.cssText =
    "background: rgba(31, 42, 68, 0.3); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--spacing-md); margin-bottom: var(--spacing-md);";

  let content = "";

  if (block.type === "text") {
    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc Texte</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <textarea data-block-field="text" rows="4" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); resize: vertical;" placeholder="Texte du paragraphe...">${escapeHtml(block.text || "")}</textarea>
        `;
  } else if (block.type === "heading") {
    const levelNum =
      typeof block.level === "number"
        ? block.level
        : block.level === "h3"
          ? 3
          : 2;
    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc Titre</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                <select data-block-field="level" style="padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
                    <option value="2" ${levelNum === 2 ? "selected" : ""}>Titre H2</option>
                    <option value="3" ${levelNum === 3 ? "selected" : ""}>Titre H3</option>
                </select>
            </div>
            <textarea data-block-field="text" rows="2" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); resize: vertical;" placeholder="Texte du titre...">${escapeHtml(block.text || "")}</textarea>
        `;
  } else if (block.type === "image") {
    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc Image</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                <input type="text" data-block-field="url" value="${escapeHtml(block.url || block.src || "")}" style="flex: 1; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);" placeholder="URL de l'image...">
                <button type="button" class="btn btn-secondary" data-block-choose-media style="white-space: nowrap;">Choisir dans Médias</button>
            </div>
            <input type="text" data-block-field="alt" value="${escapeHtml(block.alt || "")}" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);" placeholder="Texte alternatif (alt)...">
        `;
  } else if (block.type === "youtube") {
    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc YouTube</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <input type="text" data-block-field="url" value="${escapeHtml(block.url || "")}" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);" placeholder="URL YouTube (https://www.youtube.com/watch?v=...)">
        `;
  } else if (block.type === "offer") {
    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc Offre</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <input type="text" data-block-field="title" value="${escapeHtml(block.title || "")}" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); margin-bottom: var(--spacing-sm);" placeholder="Titre de l'offre...">
            <input type="text" data-block-field="url" value="${escapeHtml(block.url || "")}" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); margin-bottom: var(--spacing-sm);" placeholder="URL de l'offre...">
            <textarea data-block-field="text" rows="3" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); resize: vertical;" placeholder="Description de l'offre...">${escapeHtml(block.text || "")}</textarea>
        `;
  }

  blockEl.innerHTML = content;
  return blockEl;
}

/**
 * Affiche les blocs dans le builder (utilise bonPlanBlocks comme source de vérité)
 */
function renderBonPlanBlocks(blocks) {
  // Mettre à jour l'état global
  bonPlanBlocks = blocks || [];

  const blocksList = document.getElementById("bon-plan-blocks-list");
  if (!blocksList) return;

  blocksList.innerHTML = "";

  // Ajouter un blockId unique si absent
  bonPlanBlocks.forEach((block, index) => {
    if (!block.blockId) {
      block.blockId = `block-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
    }
  });

  bonPlanBlocks.forEach((block, index) => {
    const blockEl = createBonPlanBlockElement(block, index);
    blocksList.appendChild(blockEl);
  });
}

/**
 * Ajoute un nouveau bloc de bon plan
 */
function addBonPlanBlock(type) {
  const newBlock = {
    type,
    blockId: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  // Valeurs par défaut selon le type
  if (type === "heading") {
    newBlock.level = 2;
    newBlock.text = "";
  } else if (type === "text") {
    newBlock.text = "";
  } else if (type === "image") {
    newBlock.url = "";
    newBlock.src = "";
    newBlock.alt = "";
  } else if (type === "youtube") {
    newBlock.url = "";
  } else if (type === "offer") {
    newBlock.title = "";
    newBlock.url = "";
    newBlock.text = "";
  }

  bonPlanBlocks.push(newBlock);
  renderBonPlanBlocks(bonPlanBlocks);

  // Scroll to bottom
  const blocksList = document.getElementById("bon-plan-blocks-list");
  if (blocksList) {
    setTimeout(() => {
      blocksList.lastElementChild?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }
}

/**
 * Supprime un bloc de bon plan
 */
function removeBonPlanBlock(index) {
  if (index >= 0 && index < bonPlanBlocks.length) {
    bonPlanBlocks.splice(index, 1);
    renderBonPlanBlocks(bonPlanBlocks);
  }
}

/**
 * Déplace un bloc de bon plan
 */
function moveBonPlanBlock(index, direction) {
  if (direction === "up" && index > 0) {
    [bonPlanBlocks[index], bonPlanBlocks[index - 1]] = [
      bonPlanBlocks[index - 1],
      bonPlanBlocks[index],
    ];
    renderBonPlanBlocks(bonPlanBlocks);
  } else if (direction === "down" && index < bonPlanBlocks.length - 1) {
    [bonPlanBlocks[index], bonPlanBlocks[index + 1]] = [
      bonPlanBlocks[index + 1],
      bonPlanBlocks[index],
    ];
    renderBonPlanBlocks(bonPlanBlocks);
  }
}

/**
 * Assure que le modal test existe dans le DOM et retourne les refs
 */
function ensureTestModal() {
  let modal = document.getElementById("testModal");
  if (!modal) {
    console.warn(
      "[DEBUG] Modal test non trouvé, vérifiez que admin.html contient le modal",
    );
    return { modal: null, refs: {} };
  }

  // Collecte toutes les refs importantes
  const refs = {
    modal,
    title: document.getElementById("testModalTitle"),
    form: document.getElementById("testForm"),
    id: document.getElementById("test-id"),
    slug: document.getElementById("test-slug"),
    titleField: document.getElementById("test-title"),
    gameId: document.getElementById("test-gameId"),
    cover: document.getElementById("test-cover"),
    excerpt: document.getElementById("test-excerpt"),
    publishedAt: document.getElementById("test-publishedAt"),
    isFeatured: document.getElementById("test-isFeatured"),
    blocksList: document.getElementById("test-blocks-list"),
    criteriaList: document.getElementById("test-criteria-list"),
  };

  return { modal, refs };
}

/**
 * Remplit le formulaire test de façon sécurisée
 */
function populateTestForm(refs, test) {
  // Helpers sécurisés
  const setVal = (el, v) => {
    if (el) el.value = v ?? "";
  };
  const setChecked = (el, v) => {
    if (el) el.checked = !!v;
  };

  // DEBUG: Log temporaire pour identifier les champs manquants
  // console.log('[DEBUG populateTestForm] test:', test, 'refs:', Object.keys(refs).filter(k => !refs[k]));

  setVal(refs.id, test.id);
  setVal(refs.slug, test.slug);
  setVal(refs.titleField, test.title);
  setVal(refs.gameId, test.gameId);
  setVal(refs.cover, test.coverUrl);
  setVal(refs.excerpt, test.excerpt);
  setVal(
    refs.publishedAt,
    test.publishedAt
      ? new Date(test.publishedAt).toISOString().slice(0, 16)
      : "",
  );
  setChecked(refs.isFeatured, test.isFeatured);

  // Charger les blocs (nouveau système)
  const contentBlocks = test.contentBlocks || test.blocks;
  if (
    contentBlocks &&
    Array.isArray(contentBlocks) &&
    contentBlocks.length > 0
  ) {
    // Ajouter blockId + normaliser
    const blocksWithId = contentBlocks.map((block, idx) => ({
      ...block,
      blockId:
        block.blockId ||
        `block-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    testBlocks = blocksWithId;
    renderTestBlocks(testBlocks);
  } else {
    // Migration douce : si ancien système avec content string, créer un bloc texte
    if (test.content && test.content.trim()) {
      testBlocks = [
        {
          type: "text",
          text: test.content.trim(),
          blockId: `block-${Date.now()}-migrated-${Math.random().toString(36).substr(2, 9)}`,
        },
      ];
      renderTestBlocks(testBlocks);
    } else {
      testBlocks = [];
      renderTestBlocks([]);
    }
  }

  // Remplir les critères
  renderTestCriteria(test.criteria || []);
  updateTestAverageScore();

  // Mettre à jour le preview
  updateTestCoverPreview(test.coverUrl || "");
}

/**
 * Synchronise testBlocks depuis le DOM (préserve les valeurs saisies)
 */
function syncTestBlocksFromDOM() {
  const blocksList = document.getElementById("test-blocks-list");
  if (!blocksList) return;

  const syncedBlocks = [];
  const blockElements = blocksList.querySelectorAll(".test-block-item");

  blockElements.forEach((blockEl, index) => {
    const blockId = blockEl.dataset.blockId;
    if (!blockId) return;

    const blockType = blockEl.dataset.blockType;
    let blockData = { type: blockType, blockId };

    if (blockType === "text") {
      const textarea = blockEl.querySelector('[data-block-field="text"]');
      if (textarea) {
        blockData.text = textarea.value.trim();
      }
    } else if (blockType === "heading") {
      const select = blockEl.querySelector('[data-block-field="level"]');
      const textarea = blockEl.querySelector('[data-block-field="text"]');
      if (select && textarea) {
        blockData.level = select.value;
        blockData.text = textarea.value.trim();
      }
    } else if (blockType === "image") {
      const input = blockEl.querySelector('[data-block-field="url"]');
      const altInput = blockEl.querySelector('[data-block-field="alt"]');
      if (input) {
        blockData.url = input.value.trim();
        blockData.src = input.value.trim(); // Pour compatibilité
        if (altInput) {
          blockData.alt = altInput.value.trim();
        }
      }
    } else if (blockType === "youtube") {
      const input = blockEl.querySelector('[data-block-field="url"]');
      if (input) {
        blockData.url = input.value.trim();
      }
    } else if (blockType === "offer") {
      const titleInput = blockEl.querySelector('[data-block-field="title"]');
      const urlInput = blockEl.querySelector('[data-block-field="url"]');
      const textInput = blockEl.querySelector('[data-block-field="text"]');
      if (titleInput && urlInput && textInput) {
        blockData.title = titleInput.value.trim();
        blockData.url = urlInput.value.trim();
        blockData.text = textInput.value.trim();
      }
    }

    syncedBlocks.push(blockData);
  });

  testBlocks = syncedBlocks;
  console.log("[TEST BLOCKS] Synced from DOM:", testBlocks);
}

/**
 * Lit les blocs depuis l'état testBlocks (après synchronisation depuis le DOM)
 */
function readTestBlocks() {
  return testBlocks.map((block) => ({ ...block }));
}

/**
 * Crée un élément DOM pour un bloc de test
 */
function createTestBlockElement(block, index) {
  const blockEl = document.createElement("div");
  blockEl.className = "test-block-item";
  blockEl.dataset.blockType = block.type;
  blockEl.dataset.blockIndex = index;
  blockEl.dataset.blockId =
    block.blockId ||
    `block-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
  blockEl.style.cssText =
    "background: rgba(31, 42, 68, 0.3); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--spacing-md); margin-bottom: var(--spacing-md);";

  let content = "";

  if (block.type === "text") {
    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc Texte</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <textarea data-block-field="text" rows="4" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); resize: vertical;" placeholder="Texte du paragraphe...">${escapeHtml(block.text || "")}</textarea>
        `;
  } else if (block.type === "heading") {
    const levelNum =
      typeof block.level === "number"
        ? block.level
        : block.level === "h3"
          ? 3
          : 2;
    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc Titre</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                <select data-block-field="level" style="padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
                    <option value="2" ${levelNum === 2 ? "selected" : ""}>Titre H2</option>
                    <option value="3" ${levelNum === 3 ? "selected" : ""}>Titre H3</option>
                </select>
            </div>
            <textarea data-block-field="text" rows="2" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); resize: vertical;" placeholder="Texte du titre...">${escapeHtml(block.text || "")}</textarea>
        `;
  } else if (block.type === "image") {
    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc Image</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                <input type="text" data-block-field="url" value="${escapeHtml(block.url || block.src || "")}" style="flex: 1; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);" placeholder="URL de l'image...">
                <button type="button" class="btn btn-secondary" data-block-choose-media style="white-space: nowrap;">Choisir dans Médias</button>
            </div>
            <input type="text" data-block-field="alt" value="${escapeHtml(block.alt || "")}" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);" placeholder="Texte alternatif (alt)...">
        `;
  } else if (block.type === "youtube") {
    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc YouTube</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <input type="text" data-block-field="url" value="${escapeHtml(block.url || "")}" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);" placeholder="URL YouTube (https://www.youtube.com/watch?v=...)">
        `;
  } else if (block.type === "offer") {
    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc Offre</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <input type="text" data-block-field="title" value="${escapeHtml(block.title || "")}" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); margin-bottom: var(--spacing-sm);" placeholder="Titre de l'offre...">
            <input type="text" data-block-field="url" value="${escapeHtml(block.url || "")}" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); margin-bottom: var(--spacing-sm);" placeholder="URL de l'offre...">
            <textarea data-block-field="text" rows="3" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); resize: vertical;" placeholder="Description de l'offre...">${escapeHtml(block.text || "")}</textarea>
        `;
  }

  blockEl.innerHTML = content;
  return blockEl;
}

/**
 * Affiche les blocs dans le builder (utilise testBlocks comme source de vérité)
 */
function renderTestBlocks(blocks) {
  // Mettre à jour l'état global
  testBlocks = blocks || [];

  const blocksList = document.getElementById("test-blocks-list");
  if (!blocksList) return;

  blocksList.innerHTML = "";

  // Ajouter un blockId unique si absent
  testBlocks.forEach((block, index) => {
    if (!block.blockId) {
      block.blockId = `block-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
    }
  });

  testBlocks.forEach((block, index) => {
    const blockEl = createTestBlockElement(block, index);
    blocksList.appendChild(blockEl);
  });
}

/**
 * Ajoute un nouveau bloc de test
 */
function addTestBlock(type) {
  const newBlock = {
    type,
    blockId: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  // Valeurs par défaut selon le type
  if (type === "heading") {
    newBlock.level = 2;
    newBlock.text = "";
  } else if (type === "text") {
    newBlock.text = "";
  } else if (type === "image") {
    newBlock.url = "";
    newBlock.src = "";
    newBlock.alt = "";
  } else if (type === "youtube") {
    newBlock.url = "";
  } else if (type === "offer") {
    newBlock.title = "";
    newBlock.url = "";
    newBlock.text = "";
  }

  testBlocks.push(newBlock);
  renderTestBlocks(testBlocks);

  // Scroll to bottom
  const blocksList = document.getElementById("test-blocks-list");
  if (blocksList) {
    setTimeout(() => {
      blocksList.lastElementChild?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }
}

/**
 * Supprime un bloc de test
 */
function removeTestBlock(index) {
  if (index >= 0 && index < testBlocks.length) {
    testBlocks.splice(index, 1);
    renderTestBlocks(testBlocks);
  }
}

/**
 * Déplace un bloc de test
 */
function moveTestBlock(index, direction) {
  if (direction === "up" && index > 0) {
    [testBlocks[index], testBlocks[index - 1]] = [
      testBlocks[index - 1],
      testBlocks[index],
    ];
    renderTestBlocks(testBlocks);
  } else if (direction === "down" && index < testBlocks.length - 1) {
    [testBlocks[index], testBlocks[index + 1]] = [
      testBlocks[index + 1],
      testBlocks[index],
    ];
    renderTestBlocks(testBlocks);
  }
}

// ============================================
// TESTS - Fonctions de routing et rendu public
// ============================================

/**
 * Résout un test depuis l'URL (slug prioritaire, fallback id)
 */
function resolveTestFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get("slug");
  const id = urlParams.get("id");

  const tests = getTestsData();

  let test = null;

  // Priorité au slug
  if (slug) {
    test = tests.find((t) => t.slug === slug);
  }

  // Fallback à l'id
  if (!test && id) {
    test = tests.find((t) => t.id === id);
  }

  return test;
}

/**
 * Rend les blocs de test en HTML pour l'affichage public
 */
function renderTestBlocksToHtml(blocks) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return "";
  }

  let html = "";

  blocks.forEach((block) => {
    if (block.type === "text") {
      const text = toText(block.text);
      if (text) {
        const paragraphs = text.split("\n").filter((p) => p.trim());
        if (paragraphs.length > 0) {
          paragraphs.forEach((p) => {
            html += `<p style="margin-bottom: var(--spacing-lg); line-height: 1.8; color: var(--color-text-primary); white-space: pre-wrap;">${escapeHtml(p)}</p>`;
          });
        }
      }
    } else if (block.type === "heading") {
      const levelNum =
        typeof block.level === "number"
          ? block.level
          : block.level === "h3"
            ? 3
            : 2;
      const levelTag = levelNum === 3 ? "h3" : "h2";
      const text = toText(block.text);
      if (text) {
        html += `<${levelTag} style="margin-top: var(--spacing-xl); margin-bottom: var(--spacing-md); color: var(--color-text-primary); font-size: ${levelNum === 2 ? "1.75em" : "1.5em"}; font-weight: var(--font-weight-semibold);">${escapeHtml(text)}</${levelTag}>`;
      }
    } else if (
      block.type === "image" ||
      block.type === "img" ||
      block.type === "media"
    ) {
      const src =
        (block && typeof block.src === "string" && block.src.trim()) ||
        (block && typeof block.url === "string" && block.url.trim()) ||
        (block && typeof block.value === "string" && block.value.trim()) ||
        "";

      if (src && isImageSrcPreviewable(src)) {
        const alt = toText(block.alt) || "";
        html += `<figure class="article-media">
                    <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">
                </figure>`;
      }
    } else if (block.type === "youtube") {
      const videoId = extractYouTubeId(block.url);
      if (videoId) {
        const embedSrc = getYouTubeEmbedSrc(videoId);
        if (embedSrc) {
          html += `<div class="article-media youtube-container">
                        <iframe width="560" height="315" src="${escapeHtml(embedSrc)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
                    </div>`;
        }
      }
    } else if (block.type === "offer") {
      // Rendu simplifié pour les offres dans les tests
      const title = toText(block.title);
      const url = toText(block.url);
      const text = toText(block.text);

      if (title && url) {
        html += `<div class="test-offer">
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(text)}</p>
                    <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="btn btn-primary">Voir l'offre</a>
                </div>`;
      }
    }
  });

  return html;
}

/**
 * Ouvre le modal bon plan (création/édition)
 */
function openBonPlanModal(mode = "create", bonPlan = null) {
  const modal = document.getElementById("bonPlanModal");
  const title = document.getElementById("bonPlanModalTitle");
  const form = document.getElementById("bonPlanForm");

  if (!modal || !title || !form) {
    console.error("[openBonPlanModal] Modal non trouvé");
    return;
  }

  clearBonPlanFormErrors();

  if (mode === "create") {
    title.textContent = "Ajouter un bon plan";
    form.reset();
    document.getElementById("bon-plan-id").value = "";
    updateBonPlanCoverPreview("");
    // Initialiser les blocs vides
    bonPlanBlocks = [];
    renderBonPlanBlocks(bonPlanBlocks);
  } else if (mode === "edit" && bonPlan) {
    title.textContent = "Modifier un bon plan";
    fillBonPlanForm(bonPlan);
  }

  // Afficher les médias récents sous le champ cover
  renderRecentMedia("bon-plan");

  modal.classList.add("is-open");
}

/**
 * Remplit le formulaire bon plan
 */
function fillBonPlanForm(bonPlan) {
  document.getElementById("bon-plan-id").value = bonPlan.id || "";
  document.getElementById("bon-plan-slug").value = bonPlan.slug || "";
  document.getElementById("bon-plan-title").value = bonPlan.title || "";
  document.getElementById("bon-plan-cover").value = bonPlan.coverUrl || "";
  document.getElementById("bon-plan-excerpt").value = bonPlan.excerpt || "";
  document.getElementById("bon-plan-external-url").value =
    bonPlan.externalUrl || "";
  document.getElementById("bon-plan-merchant").value = bonPlan.merchant || "";
  document.getElementById("bon-plan-price").value = bonPlan.price || "";
  document.getElementById("bon-plan-old-price").value = bonPlan.oldPrice || "";
  document.getElementById("bon-plan-discount").value =
    bonPlan.discountPercent || "";
  document.getElementById("bon-plan-publishedAt").value = bonPlan.publishedAt
    ? new Date(bonPlan.publishedAt).toISOString().slice(0, 16)
    : "";
  document.getElementById("bon-plan-isFeatured").checked =
    bonPlan.isFeatured || false;
  document.getElementById("bon-plan-openInNewTab").checked =
    bonPlan.openInNewTab !== false;

  // Charger les blocs
  const contentBlocks = bonPlan.contentBlocks || [];
  if (
    contentBlocks &&
    Array.isArray(contentBlocks) &&
    contentBlocks.length > 0
  ) {
    // Ajouter blockId + normaliser
    const blocksWithId = contentBlocks.map((block, idx) => ({
      ...block,
      blockId:
        block.blockId ||
        `block-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    bonPlanBlocks = blocksWithId;
    renderBonPlanBlocks(bonPlanBlocks);
  } else {
    bonPlanBlocks = [];
    renderBonPlanBlocks([]);
  }

  // Mettre à jour le preview
  updateBonPlanCoverPreview(bonPlan.coverUrl || "");
}

/**
 * Met à jour le preview de l'image cover bon plan
 */
function updateBonPlanCoverPreview(url) {
  const img = document.getElementById("bonPlanCoverPreviewImg");
  const placeholder = document.getElementById("bonPlanCoverPreviewPlaceholder");

  if (img && placeholder) {
    if (url && url.trim() && isImageSrcPreviewable(url)) {
      img.src = url;
      img.style.display = "block";
      placeholder.style.display = "none";
    } else {
      img.style.display = "none";
      placeholder.style.display = "block";
    }
  }
}

/**
 * Valide et traite les données du formulaire bon plan
 */
function normalizeBonPlanPayload(formData) {
  const id = (formData.get("id") || "").trim();
  const title = (formData.get("title") || "").trim();

  // Générer ID si nouveau bon plan
  let finalId = id;
  if (!finalId) {
    const baseSlug = slugify(title);
    finalId = generateId(getBonsPlansData(), baseSlug);
  }

  // Générer slug si manquant
  let slug = (formData.get("slug") || "").trim();
  if (!slug && title) {
    slug = slugify(title);
    // Assurer l'unicité du slug
    const existingBonsPlans = getBonsPlansData().filter(
      (bp) => bp.id !== finalId,
    );
    let uniqueSlug = slug;
    let counter = 1;
    while (existingBonsPlans.some((bp) => bp.slug === uniqueSlug)) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
    slug = uniqueSlug;
  }

  // Lire les blocs depuis bonPlanBlocks (synchronisés depuis le DOM)
  const contentBlocks = readBonPlanBlocks();

  return {
    id: finalId,
    slug,
    title,
    coverUrl: (formData.get("coverUrl") || "").trim(),
    excerpt: (formData.get("excerpt") || "").trim(),
    contentBlocks,
    externalUrl: (formData.get("externalUrl") || "").trim(),
    merchant: (formData.get("merchant") || "").trim(),
    price: formData.get("price") ? parseFloat(formData.get("price")) : null,
    oldPrice: formData.get("oldPrice")
      ? parseFloat(formData.get("oldPrice"))
      : null,
    discountPercent: formData.get("discountPercent")
      ? parseInt(formData.get("discountPercent"))
      : null,
    publishedAt: (formData.get("publishedAt") || "").trim(),
    isFeatured: formData.get("isFeatured") === "on",
    openInNewTab: formData.get("openInNewTab") !== "false",
  };
}

/**
 * Gère la soumission du formulaire bon plan
 */
function handleBonPlanFormSubmit(e) {
  e.preventDefault();

  // Synchroniser les blocs depuis le DOM avant de lire le formulaire
  syncBonPlanBlocksFromDOM();

  const formData = new FormData(e.target);

  try {
    const bonPlan = normalizeBonPlanPayload(formData);
    const isEdit = !!bonPlan.id;

    if (upsertBonPlan(bonPlan)) {
      closeBonPlanModal();
      renderAdminBonsPlansList();

      // ADDED: Mise à jour des compteurs admin
      updateAdminSiteCounters();

      debugLog("ADMIN", { bonPlanSaved: bonPlan.id, isEdit });
    }
  } catch (error) {
    console.error("[handleBonPlanFormSubmit] Erreur:", error);
    showBonPlanFormErrors({ title: error.message });
  }
}

/**
 * Ajoute/modifie un bon plan
 */
function upsertBonPlan(bonPlan) {
  const bonsPlans = getBonsPlansData();
  const existingIndex = bonsPlans.findIndex((bp) => bp.id === bonPlan.id);

  if (existingIndex >= 0) {
    bonsPlans[existingIndex] = bonPlan;
  } else {
    bonsPlans.push(bonPlan);
  }

  saveBonsPlansOverride(bonsPlans);
  return true;
}

/**
 * Supprime un bon plan
 */
function deleteBonPlan(id) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce bon plan ?")) return;

  const bonsPlans = getBonsPlansData();
  const filtered = bonsPlans.filter((bp) => bp.id !== id);
  saveBonsPlansOverride(filtered);
  renderAdminBonsPlansList();

  // ADDED: Mise à jour des compteurs admin
  updateAdminSiteCounters();
}

/**
 * Rend la liste des bons plans dans l'admin
 */
function renderAdminBonsPlansList() {
  const container = document.getElementById("adminBonsPlansList");
  if (!container) return;

  const bonsPlans = getBonsPlansData();

  if (bonsPlans.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: var(--color-text-secondary);">Aucun bon plan</p>';
    return;
  }

  container.innerHTML = bonsPlans
    .map(
      (bonPlan) => `
        <div class="admin-item" data-id="${bonPlan.id}">
            <div class="admin-item-content">
                <div class="admin-item-title">${escapeHtml(bonPlan.title || "Sans titre")}</div>
                <div class="admin-item-meta">
                    ${bonPlan.merchant ? `<span>${escapeHtml(bonPlan.merchant)}</span>` : ""}
                    ${bonPlan.price ? `<span>${bonPlan.price.toFixed(2)}€</span>` : ""}
                    ${bonPlan.isFeatured ? '<span class="featured-badge">⭐ Mis en avant</span>' : ""}
                    <span>${bonPlan.publishedAt ? new Date(bonPlan.publishedAt).toLocaleDateString("fr-FR") : "Date inconnue"}</span>
                </div>
            </div>
            <div class="admin-item-actions">
                <button class="btn btn-secondary btn-sm" onclick="openBonPlanModal('edit', ${JSON.stringify(bonPlan).replace(/"/g, "&quot;")})">Modifier</button>
                <button class="btn btn-danger btn-sm" onclick="deleteBonPlan('${bonPlan.id}')">Supprimer</button>
            </div>
        </div>
    `,
    )
    .join("");

  // ADDED: Appliquer le fallback aux images de cette liste
  attachImageFallback(container);
}

/**
 * Ferme le modal bon plan
 */
function closeBonPlanModal() {
  const modal = document.getElementById("bonPlanModal");
  if (modal) {
    modal.classList.remove("is-open");
    // Reset form
    const form = document.getElementById("bonPlanForm");
    if (form) form.reset();
    bonPlanBlocks = [];
    renderBonPlanBlocks([]);
  }
}

/**
 * Nettoie les erreurs du formulaire bon plan
 */
function clearBonPlanFormErrors() {
  document.querySelectorAll("#bonPlanForm .form-error").forEach((el) => {
    el.textContent = "";
    el.style.display = "none";
  });
}

/**
 * Affiche les erreurs du formulaire bon plan
 */
function showBonPlanFormErrors(errors) {
  clearBonPlanFormErrors();

  Object.keys(errors).forEach((field) => {
    const errorEl = document.getElementById(`error-bon-plan-${field}`);
    if (errorEl) {
      errorEl.textContent = errors[field];
      errorEl.style.display = "block";
    }
  });
}

/**
 * Initialise et rend la page test.html
 */
function initTestPage() {
  const container = document.getElementById("testContent");
  if (!container) return;

  const test = resolveTestFromUrl();
  const games = getGamesData();

  if (!test) {
    // Test introuvable
    container.innerHTML = `
            <section class="page-hero">
                <h1>Test introuvable</h1>
                <p>Le test demandé n'existe pas ou a été supprimé.</p>
                <a href="tests.html" class="btn btn-primary">Retour aux tests</a>
            </section>
        `;
    return;
  }

  // Récupérer les infos du jeu lié
  const game = test.gameId ? games.find((g) => g.id === test.gameId) : null;
  const gameName = game ? game.title : test.gameTitle || "Jeu inconnu";
  const platforms = game
    ? (game.platforms || []).join(", ")
    : "Toutes plateformes";

  // Calculer la date formatée
  const publishedDate = test.publishedAt
    ? new Date(test.publishedAt).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Date inconnue";

  // Générer le lien vers la page détail
  const testUrl = test.slug
    ? `test.html?slug=${encodeURIComponent(test.slug)}`
    : `test.html?id=${encodeURIComponent(test.id)}`;

  // Générer le HTML
  const imageHtml = test.coverUrl
    ? `<div class="article-image" style="background-image: url('${escapeHtml(test.coverUrl)}');"></div>`
    : `<div class="article-image placeholder-image"></div>`;

  // Critères d'évaluation
  const criteriaHtml =
    test.criteria && Array.isArray(test.criteria) && test.criteria.length > 0
      ? `<div class="test-criteria">
                <h2>Critères d'évaluation</h2>
                <div class="criteria-list">
                    ${test.criteria
                      .map(
                        (criterion) => `
                        <div class="criterion-item">
                            <div class="criterion-label">${escapeHtml(criterion.label || "Critère")}</div>
                            <div class="criterion-score">${(criterion.score || 0).toFixed(1)}/10</div>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
                <div class="criteria-average">
                    <strong>Note moyenne: ${test.score ? test.score.toFixed(1) : "N/A"}/10</strong>
                </div>
            </div>`
      : "";

  container.innerHTML = `
            <section class="page-hero test-hero">
                ${imageHtml}
                <div class="hero-overlay">
                    <div class="hero-content">
                        <div class="test-badge">${test.score ? test.score.toFixed(1) : "N/A"}/10</div>
                        <h1>${escapeHtml(test.title || "Test sans titre")}</h1>
                        <div class="test-meta">
                            <span>Jeu: ${escapeHtml(gameName)}</span>
                            <span>Plateformes: ${escapeHtml(platforms)}</span>
                            <span>Publié le: ${publishedDate}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section class="test-content">
                ${
                  test.excerpt
                    ? `
                    <div class="test-summary">
                        <h2>Résumé</h2>
                        <p>${escapeHtml(test.excerpt)}</p>
                    </div>
                `
                    : ""
                }

                ${
                  test.contentBlocks || test.blocks
                    ? `
                    <div class="test-verdict">
                        <h2>Verdict</h2>
                        <div class="content">${renderTestBlocksToHtml(test.contentBlocks || test.blocks)}</div>
                    </div>
                `
                    : ""
                }

                ${criteriaHtml}

                ${
                  game
                    ? `
                    <div class="test-game-info">
                        <h2>À propos du jeu</h2>
                        <div class="game-card-compact">
                            <div class="game-image-compact" style="background-image: url('${escapeHtml(game.cover || "")}');"></div>
                            <div class="game-info-compact">
                                <h3>${escapeHtml(game.title)}</h3>
                                <p>${escapeHtml(game.description || "")}</p>
                                <div class="game-platforms">${escapeHtml(platforms)}</div>
                            </div>
                        </div>
                    </div>
                `
                    : ""
                }
            </section>
        `;

  // Monter les widgets communs
  mountPromosWidget();
  renderLatestArticlesSidebar();
  renderPartnershipBlock();
}

// Debug visuel temporaire pour diagnostiquer les grilles
window.DEBUG_GRID = false; // Mettre à true pour activer le debug visuel

if (window.DEBUG_GRID) {
  // Ajouter des styles de debug
  const debugStyle = document.createElement("style");
  debugStyle.textContent = `
    .debug-grid-info {
      position: sticky;
      top: 100px;
      left: 10px;
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      font-family: monospace;
    }
    .debug-grid-target {
      outline: 2px solid #2d7dff !important;
      position: relative;
    }
    .debug-grid-target::before {
      content: '🎯 GRID TARGET';
      position: absolute;
      top: -20px;
      left: 0;
      background: #2d7dff;
      color: white;
      padding: 2px 6px;
      font-size: 10px;
      border-radius: 2px;
    }
  `;
  document.head.appendChild(debugStyle);

  // Fonction pour ajouter le debug info
  window.addGridDebug = function (container, label, itemsCount, hasPagination) {
    if (!window.DEBUG_GRID) return;

    // Ajouter outline au conteneur
    container.classList.add("debug-grid-target");

    // Créer badge d'info
    const debugBadge = document.createElement("div");
    debugBadge.className = "debug-grid-info";
    debugBadge.textContent = `${label} | items: ${itemsCount} | page: ${hasPagination ? "ON" : "OFF"}`;
    document.body.appendChild(debugBadge);
  };
}

// Debug diagnostics (si activé)
diagnoseLayout();
diagnoseData();

// ADDED: Rendre la page article si on est sur article.html
if (window.location.pathname.includes("article.html")) {
  renderArticlePage();
}

// ADDED: Rendre la page équipe si on est sur equipe.html
if (window.location.pathname.includes("equipe.html")) {
  if (typeof renderTeamPage === "function") {
    renderTeamPage();
  }
} else if (window.location.pathname.includes("membre.html")) {
  // ADDED: Rendre la page membre si on est sur membre.html
  if (typeof renderMemberPage === "function") {
    renderMemberPage();
  }
} else if (window.location.pathname.includes("auteur.html")) {
  // ADDED: Rendre la page auteur si on est sur auteur.html
  if (typeof renderAuteurPage === "function") {
    renderAuteurPage();
  }
} else if (
  document.querySelector(".content") &&
  (window.location.pathname.includes("articles/") ||
    document.querySelector("article.page-hero"))
) {
  // ADDED: Ancienne fonction pour compatibilité avec les anciennes pages
  renderArticleContent();
}

// ============================================
// GESTION DE LA VUE SUR jeux.html
// ============================================

// Fonction pour appliquer la vue sur jeux.html
window.applyGameView = function () {
  // Vérifier si on est sur jeux.html
  const isJeuxPage =
    window.location.pathname.includes("jeux.html") ||
    document.querySelector("#games-grid");
  if (!isJeuxPage) return;

  // Lire le paramètre view de l'URL
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  // Mode normal : tout afficher
  const gamesGrid = document.getElementById("games-grid");
  const gamesTitle = document.getElementById("games-title");
  const gamesSubtitle = document.getElementById("games-subtitle");

  if (gamesTitle) {
    gamesTitle.textContent = "JEUX";
  }
  if (gamesSubtitle) {
    gamesSubtitle.textContent = "Découvrez notre sélection de jeux";
  }

  if (gamesGrid) gamesGrid.style.display = "";

  // Afficher toutes les cartes
  const allGameCards = document.querySelectorAll(".game-card[data-game-id]");
  allGameCards.forEach((card) => {
    card.style.display = "";
  });

  // Appliquer le tri après avoir tout affiché
  applySortAndFilters();
};

// ============================================
// RENDU DYNAMIQUE DES JEUX
// ============================================

/**
 * Génère les cartes de jeux dans la grille à partir des données
 * @param {Array} games - Tableau des jeux à afficher
 */
function renderGames(games, containerId = "gamesGrid", options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    // ADDED: Ne pas log si c'est juste que le conteneur n'existe pas sur cette page
    return;
  }

  // Wrapper premium pour la grille
  ensurePremiumPanel(container, options.panel || {});

  // Debug visuel
  if (window.DEBUG_GRID) {
    window.addGridDebug(
      container,
      `GAMES-${containerId}`,
      games.length,
      options.enablePagination !== false,
    );
  }

  // Fonction pour rendre un seul jeu
  function renderGameItem(game) {
    // PATCH: Sécuriser les propriétés du jeu
    const safePlatforms = Array.isArray(game.platforms) ? game.platforms : [];
    const safeGenres = Array.isArray(game.genres) ? game.genres : [];
    const safeTitle = typeof game.title === "string" ? game.title : "";
    const safeId = game.id || "";
    const safeDescription =
      typeof game.description === "string" ? game.description : "";

    // Convertir les plateformes et genres en minuscules pour les data-attributes (filtres)
    const consoleAttr = safePlatforms.map((p) => p.toLowerCase()).join(" ");
    const genreAttr = safeGenres.map((g) => g.toLowerCase()).join(" ");

    // ADDED: Gérer l'image (image ou placeholder)
    let imageHtml = "";
    if (game.image && game.image.trim()) {
      imageHtml = `<img src="${game.image}" alt="${safeTitle}" loading="lazy">`;
    } else {
      imageHtml = `<div class="placeholder-image">
                <span class="placeholder-text">${safeTitle.charAt(0).toUpperCase()}</span>
            </div>`;
    }

    // Rendre le HTML de la carte
    return `
            <div class="game-card" data-console="${consoleAttr}" data-genre="${genreAttr}" data-game-id="${safeId}">
                <a href="jeu.html?id=${safeId}" class="game-link">
                    <div class="game-image">
                        ${imageHtml}
                    </div>
                    <div class="game-content">
                        <div class="game-header">
                            <h3 class="game-title">${safeTitle}</h3>
                        </div>
                        <p class="game-description">${safeDescription}</p>
                        <div class="game-meta">
                            <div class="game-info">
                                ${safePlatforms.length > 0 ? `<span class="game-platforms">${safePlatforms.join(", ")}</span>` : ""}
                                ${safeGenres.length > 0 ? `<span class="game-genres">${safeGenres.join(", ")}</span>` : ""}
                                ${game.studio ? `<span class="game-studio">${game.studio}</span>` : ""}
                            </div>
                        </div>
                    </div>
                </a>
            </div>
        `;
  }

  // Si pagination activée, utiliser initGridPagination
  if (options.enablePagination !== false) {
    // Trouver ou créer le conteneur pagination
    let pagerEl = container.nextElementSibling;
    if (!pagerEl || !pagerEl.classList.contains("pagination")) {
      pagerEl = document.createElement("div");
      pagerEl.className = "pagination";
      container.parentNode.insertBefore(pagerEl, container.nextSibling);
    }

    return initGridPagination({
      gridEl: container,
      pagerEl: pagerEl,
      items: games,
      pageSize: options.pageSize || 12,
      renderItem: renderGameItem,
      onPageChange: options.onPageChange,
      key: options.key || "games",
    });
  }

  // Mode sans pagination (ancien comportement)
  container.innerHTML = "";

  // Générer une carte pour chaque jeu
  games.forEach((game) => {
    container.insertAdjacentHTML("beforeend", renderGameItem(game));
  });

  // Mettre à jour la référence gameCards pour les filtres
  gameCards = document.querySelectorAll(".game-card");

  // Appliquer fallbacks aux images après rendu
  setTimeout(() => applyImageFallbacks(container), 100);
}

// ============================================
// INITIALISATION ADMIN
// ============================================

/**
 * Récupère les jeux de manière sécurisée
 * @returns {Array} - Tableau des jeux
 */
function getGamesSafe() {
  // ADDED: Utiliser getGamesData() au lieu d'accéder directement à window.GAMES
  return getGamesData();
}

/**
 * ADDED: Rend la liste des jeux dans l'interface admin (version durcie - relit toujours getGamesData())
 */
function renderAdminGamesList() {
  // ADDED: Vérification que nous sommes sur la page admin
  if (document.body?.dataset?.page !== "admin") {
    return; // Pas sur admin, ne rien faire
  }

  // FIX: Vérifier que la section Jeux est visible (pas cachée par le système de tabs)
  const section = document.getElementById("section-games");
  if (section && section.classList.contains("is-hidden")) {
    return; // Section cachée, ne rien rendre
  }

  let list = document.getElementById("adminGamesList");
  if (!list) {
    console.warn(
      "adminGamesList container not found - retrying in next frame...",
    );
    // FIX: Retry mechanism pour timing issues
    requestAnimationFrame(() => {
      list = document.getElementById("adminGamesList");
      if (list) {
        console.log("adminGamesList found on retry, rendering...");
        renderAdminGamesList();
      } else {
        console.error("adminGamesList still not found after retry");
      }
    });
    return;
  }

  // ADDED: Toujours relire getGamesData() au début (anti-bug état obsolète)
  const games = getGamesData();

  if (!games || !Array.isArray(games) || !games.length) {
    list.innerHTML =
      '<div class="empty-state">Aucun jeu chargé (data.js non lu)</div>';
    return;
  }

  // ADDED: Rendu avec data-edit et data-delete pour event delegation robuste
  list.innerHTML = games
    .map(
      (g) => `
        <div class="admin-game-row">
            <div>
                <div class="admin-game-title">${g.title || "Sans titre"}</div>
                <div class="admin-game-meta">${(g.platforms || []).join(" • ")} — ${(g.genres || []).join(" • ")}</div>
            </div>
            <div class="admin-game-actions">
                <button class="btn btn-secondary" data-edit="${g.id || ""}">Modifier</button>
                <button class="btn btn-secondary" data-delete="${g.id || ""}">Supprimer</button>
            </div>
        </div>
    `,
    )
    .join("");

  // ADDED: Appliquer le fallback aux images de cette liste
  attachImageFallback(list);
}

/**
 * Initialise l'interface admin si on est sur la page admin
 */
function initAdmin() {
  // ADDED: Guard pour protéger la home - ne rien faire si pas sur page admin
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) {
    return; // Pas sur admin, ne rien faire
  }

  try {
    // FIX: Ne plus appeler renderAdminGamesList ici, sera appelé par setAdminTab quand section active
    // renderAdminGamesList(); // REMOVED
    // ADDED: Initialiser la logique du modal admin
    initAdminPage();
  } catch (e) {
    console.error("Erreur lors de l'initialisation admin:", e);
    const list = document.getElementById("adminGamesList");
    if (list) {
      list.innerHTML =
        '<div class="empty-state" style="color: #fca5a5;">Erreur chargement data.js — vérifie le chemin ./data.js</div>';
    }
  }
}

// ============================================
// ADDED: LOGIQUE ADMIN (Modal Create/Edit)
// ============================================

// ============================================
// ADDED: PERSISTANCE CENTRALISÉE (override localStorage)
// ============================================

/**
 * ADDED: Lit l'override depuis localStorage (retourne null si vide/invalid)
 */
function getGamesOverride() {
  const raw = localStorage.getItem(window.LMD.storageKeys.games);
  if (!raw) {
    return null;
  }
  try {
    const stored = JSON.parse(raw);
    if (Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
  } catch (e) {
    console.warn("Erreur lors de la lecture de l'override:", e);
  }
  return null;
}

/**
 * ADDED: Écrit l'override dans localStorage (une seule fonction d'écriture)
 */
function saveGamesOverride(nextGames) {
  try {
    localStorage.setItem(
      window.LMD.storageKeys.games,
      JSON.stringify(nextGames),
    );
  } catch (e) {
    console.error("Erreur lors de la sauvegarde de l'override:", e);
    throw new Error("Impossible de sauvegarder les jeux");
  }
}

/**
 * ADDED: Normalise un jeu pour garantir la cohérence des clés
 */
function normalizeGame(game) {
  if (!game || typeof game !== "object") return game;

  const normalized = {
    ...game,
    // ADDED: Garantir arrays propres pour platforms/genres/modes
    platforms: Array.isArray(game.platforms)
      ? game.platforms.map((p) => toText(p)).filter((p) => p)
      : [],
    genres: Array.isArray(game.genres)
      ? game.genres.map((g) => toText(g)).filter((g) => g)
      : [],
    modes: Array.isArray(game.modes)
      ? game.modes.map((m) => toText(m)).filter((m) => m)
      : undefined,
    // ADDED: Garantir strings trim
    title: toText(game.title),
    status: toText(game.status) || "released",
    releaseDate: toText(game.releaseDate || game.release || game.year || ""),
    cover: toText(game.cover || game.image || ""),
    image: toText(game.cover || game.image || ""), // ADDED: Alias pour compatibilité
    shortDesc: toText(game.shortDesc || game.excerpt || game.subtitle || ""),
    excerpt: toText(game.shortDesc || game.excerpt || game.subtitle || ""), // ADDED: Alias pour compatibilité
    content: toText(game.content || game.description || ""),
    description: toText(game.content || game.description || ""), // ADDED: Alias pour compatibilité
    studio: toText(game.studio) || undefined,
    difficulty: toText(game.difficulty) || undefined,
    duration: toText(game.duration) || undefined,
  };

  // ADDED: Ne pas inclure les champs undefined
  if (!normalized.modes || normalized.modes.length === 0) {
    delete normalized.modes;
  }
  if (!normalized.studio) {
    delete normalized.studio;
  }
  if (!normalized.difficulty) {
    delete normalized.difficulty;
  }
  if (!normalized.duration) {
    delete normalized.duration;
  }

  return normalized;
}

/**
 * ADDED: Source de vérité unique pour les données de jeux (admin + pages publiques)
 */
function getGamesData() {
  const override = getGamesOverride();
  const games = override || window.BASE_GAMES || [];

  // ADDED: Normaliser tous les jeux pour migration souple et cohérence
  if (Array.isArray(games)) {
    return games.map((game) => normalizeGame(game));
  }

  return games;
}

// ============================================
// ADDED: GESTION ARTICLES (localStorage override)
// ============================================

/**
 * ADDED: Lit l'override articles depuis localStorage (retourne null si vide/invalid)
 */
function getArticlesOverride() {
  const raw = localStorage.getItem(window.LMD.storageKeys.articles);
  if (!raw) {
    return null;
  }
  try {
    const stored = JSON.parse(raw);
    if (Array.isArray(stored) && stored.length >= 0) {
      return stored;
    }
  } catch (e) {
    // Fallback silencieux (zéro console error)
  }
  return null;
}

/**
 * ADDED: Écrit l'override articles dans localStorage
 */
function saveArticlesOverride(nextArticles) {
  try {
    const value = JSON.stringify(nextArticles);

    // ADDED (temp): Debug admin uniquement - tracer EXACTEMENT ce qui est écrit dans le storage articles
    const isAdminPage =
      document.body &&
      document.body.dataset &&
      document.body.dataset.page === "admin";
    if (isAdminPage) {
      function __debugSetItem(key, value) {
        try {
          const preview = (() => {
            try {
              return JSON.parse(value);
            } catch {
              return null;
            }
          })();
          const first = Array.isArray(preview) ? preview[0] : preview;
          const blocks = first && (first.blocks || first.contentBlocks);
          let imgDisplay = null;
          if (Array.isArray(blocks)) {
            const img = blocks.find(
              (b) =>
                b &&
                (b.type === "image" ||
                  b.type === "img" ||
                  b.type === "media") &&
                (b.display || b.mode),
            );
            if (img) imgDisplay = img.display || img.mode || null;
          }
          console.debug("[admin][storage] setItem key=", key);
          console.debug(
            "[admin][storage] first keys=",
            first ? Object.keys(first) : null,
          );
          console.debug(
            "[admin][storage] blocks?",
            Array.isArray(blocks) ? blocks.length : null,
            "imgDisplay=",
            imgDisplay,
          );
        } catch (e) {
          console.debug(
            "[admin][storage] setItem key=",
            key,
            "(debug failed)",
            e,
          );
        }
        localStorage.setItem(key, value);
      }

      __debugSetItem(window.LMD.storageKeys.articles, value);
      return true;
    }

    localStorage.setItem(window.LMD.storageKeys.articles, value);
  } catch (e) {
    // ADDED: Détecter et gérer les erreurs de quota localStorage
    const isQuotaError =
      e.name === "QuotaExceededError" ||
      e.code === 22 ||
      e.code === 1014 ||
      (e.message && e.message.toLowerCase().includes("quota"));

    if (isQuotaError) {
      // Afficher une alerte UI claire
      alert(
        "Stockage plein : l'image est trop lourde. Utilise plutôt une URL (https) ou une image plus légère.",
      );
      // NE PAS écraser les données existantes - ne pas throw, retourner proprement
      return false;
    }

    // Autre erreur
    throw new Error("Impossible de sauvegarder les articles");
  }
  return true;
}

/**
 * ADDED: Source de vérité unique pour les données d'articles (admin + pages publiques)
 */
// Fonctions slugify, ensureUniqueSlug et getArticleUrl existent déjà dans le code

function getArticlesData() {
  const override = getArticlesOverride();
  const articles = override || window.BASE_ARTICLES || [];

  // ADDED: Créer une copie pour éviter de muter les données originales
  // IMPORTANT: Ne PAS générer de slugs ici (uniquement au SAVE admin)
  const hydratedArticles = Array.isArray(articles) ? [...articles] : [];

  // ADDED: Normaliser featured (default false si absent)
  hydratedArticles.forEach((article) => {
    if (article.featured === undefined || article.featured === null) {
      article.featured = false;
    } else {
      article.featured = Boolean(article.featured);
    }
    // ADDED: Normaliser author/authorName et publishedAt (default "" si absent)
    // Utiliser 'author' comme champ principal, 'authorName' pour compatibilité
    if (article.author && !article.authorName) {
      article.authorName = article.author;
    }
    if (article.authorName && !article.author) {
      article.author = article.authorName;
    }
    if (!article.author && !article.authorName) {
      article.author = "";
      article.authorName = "";
    }
    if (!article.publishedAt) {
      article.publishedAt = "";
    }
    // ADDED: Migration rétrocompatible cta/affiliateUrl → link
    // Si link absent, migrer depuis cta ou affiliateUrl
    if (!article.link) {
      if (article.cta && article.cta.type && article.cta.type !== "none") {
        // Migrer depuis cta
        article.link = {
          type: article.cta.type,
          url: (article.cta.url || "").trim(),
          text: (article.cta.label || "").trim(),
          note: "",
        };
      } else if (article.affiliateUrl || article.affiliateLink) {
        // Migrer depuis affiliateUrl
        const affiliateUrl =
          article.affiliateUrl || article.affiliateLink || "";
        if (affiliateUrl && affiliateUrl.trim()) {
          article.link = {
            type: "affiliate",
            url: affiliateUrl.trim(),
            text: "",
            note: "",
          };
        }
      }
    }
    // Normaliser link (default type="none" si absent)
    if (!article.link) {
      article.link = {
        type: "none",
        url: "",
        title: "",
        text: "",
        buttonText: "",
        discount: "",
      };
    } else {
      // S'assurer que link a la structure complète
      if (!article.link.type) article.link.type = "none";
      if (!article.link.url) article.link.url = "";
      if (!article.link.title) article.link.title = "";
      if (!article.link.text) article.link.text = "";
      if (!article.link.buttonText) article.link.buttonText = "";
      if (!article.link.discount) article.link.discount = "";
    }
    // Garder affiliateUrl pour compatibilité (mais ne plus l'utiliser pour l'affichage)
    if (article.affiliateLink && !article.affiliateUrl) {
      article.affiliateUrl = article.affiliateLink;
    }
    if (!article.affiliateUrl) {
      article.affiliateUrl = "";
    }
  });

  return hydratedArticles;
}

// ============================================
// ADDED: GESTION TESTS (localStorage override)
// ============================================

/**
 * ADDED: Lit l'override tests depuis localStorage (retourne null si vide/invalid)
 */
function getTestsOverride() {
  const raw = localStorage.getItem(window.LMD.storageKeys.tests);
  if (!raw) {
    return null;
  }
  try {
    const stored = JSON.parse(raw);
    if (Array.isArray(stored) && stored.length >= 0) {
      return stored;
    }
  } catch (e) {
    console.warn("Erreur lors de la lecture des tests depuis localStorage:", e);
  }
  return null;
}

/**
 * ADDED: Sauvegarde l'override tests dans localStorage
 */
function saveTestsOverride(nextTests) {
  try {
    const value = JSON.stringify(nextTests);

    // Debug admin uniquement
    const isAdminPage =
      document.body &&
      document.body.dataset &&
      document.body.dataset.page === "admin";
    if (isAdminPage) {
      function __debugSetItem(key, value) {
        try {
          const preview = (() => {
            try {
              return JSON.parse(value);
            } catch {
              return null;
            }
          })();
          const first = Array.isArray(preview) ? preview[0] : preview;
          console.debug(
            "[admin][tests] setItem first test=",
            first
              ? { id: first.id, title: first.title, score: first.score }
              : null,
          );
        } catch (e) {
          console.debug("[admin][tests] setItem debug failed", e);
        }
        localStorage.setItem(key, value);
      }

      __debugSetItem(window.LMD.storageKeys.tests, value);
      return true;
    }

    localStorage.setItem(window.LMD.storageKeys.tests, value);
    return true;
  } catch (e) {
    // Détecter et gérer les erreurs de quota localStorage
    const isQuotaError =
      e.name === "QuotaExceededError" ||
      e.code === 22 ||
      e.code === 1014 ||
      (e.message && e.message.toLowerCase().includes("quota"));

    if (isQuotaError) {
      console.error(
        "Erreur quota localStorage lors de la sauvegarde des tests. Veuillez libérer de l'espace.",
      );
      alert(
        "Erreur de sauvegarde : quota localStorage dépassé. Essayez de supprimer des données ou videz le cache du navigateur.",
      );
    } else {
      console.error("Erreur lors de la sauvegarde des tests:", e);
      alert(
        "Erreur lors de la sauvegarde des tests. Vérifiez la console pour plus de détails.",
      );
    }
    return false;
  }
}

/**
 * ADDED: Récupère les données de tests (merge base + override)
 */
function getTestsData() {
  const override = getTestsOverride();
  const tests = override || window.BASE_TESTS || [];

  // Créer une copie pour éviter de muter les données originales
  const hydratedTests = Array.isArray(tests) ? [...tests] : [];

  // Normalisation des données
  hydratedTests.forEach((test) => {
    // Normaliser score (calcul automatique depuis criteria si présent)
    if (
      test.criteria &&
      Array.isArray(test.criteria) &&
      test.criteria.length > 0
    ) {
      const validScores = test.criteria
        .map((c) => (typeof c.score === "number" ? c.score : 0))
        .filter((s) => s >= 0 && s <= 10);
      if (validScores.length > 0) {
        test.score =
          validScores.reduce((a, b) => a + b, 0) / validScores.length;
      }
    }

    // Valeurs par défaut
    if (typeof test.score !== "number" || test.score < 0 || test.score > 10) {
      test.score = 0;
    }
    if (!test.title) test.title = "";
    if (!test.excerpt) test.excerpt = "";
    if (!test.content) test.content = "";
    if (!test.coverUrl) test.coverUrl = "";
    if (!test.gameId) test.gameId = "";
    if (!test.gameTitle) test.gameTitle = "";
    if (!test.publishedAt) test.publishedAt = "";
    if (!Array.isArray(test.criteria)) test.criteria = [];
    if (!Array.isArray(test.platforms)) test.platforms = [];
    if (typeof test.isFeatured !== "boolean") test.isFeatured = false;

    // Calculer gameTitle depuis gameId si nécessaire
    if (test.gameId && !test.gameTitle) {
      const game = getGamesData().find((g) => g.id === test.gameId);
      if (game) {
        test.gameTitle = game.title;
      }
    }
  });

  return hydratedTests;
}

/**
 * ADDED: Récupère les données des bugs (localStorage uniquement)
 */
function getBugsData() {
  const raw = localStorage.getItem(window.LMD.storageKeys.bugs);
  if (!raw) {
    return [];
  }
  try {
    const stored = JSON.parse(raw);
    if (Array.isArray(stored)) {
      return stored.map((bug) => ({
        ...bug,
        // Normaliser les valeurs par défaut
        id: bug.id || "",
        title: bug.title || "",
        desc: bug.desc || "",
        severity: bug.severity || "medium",
        page: bug.page || "",
        reporter: bug.reporter || "",
        status: bug.status || "open",
        createdAt: bug.createdAt || new Date().toISOString(),
        clearedAt: bug.clearedAt || null,
      }));
    }
  } catch (e) {
    console.warn("Erreur lors du chargement des bugs:", e);
  }
  return [];
}

/**
 * ADDED: Sauvegarde les données des bugs
 */
function saveBugsData(bugs) {
  try {
    localStorage.setItem(window.LMD.storageKeys.bugs, JSON.stringify(bugs));
    return true;
  } catch (e) {
    console.error("Erreur lors de la sauvegarde des bugs:", e);
    return false;
  }
}

/**
 * ADDED: Ajoute un nouveau bug
 */
function addBug(bugData) {
  const bugs = getBugsData();
  const newBug = {
    id: "bug_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    title: bugData.title || "",
    desc: bugData.desc || "",
    severity: bugData.severity || "medium",
    page: bugData.page || "",
    reporter: bugData.reporter || "",
    status: "open",
    createdAt: new Date().toISOString(),
    clearedAt: null,
  };

  bugs.push(newBug);
  return saveBugsData(bugs) ? newBug : null;
}

/**
 * ADDED: Met à jour un bug existant
 */
function updateBug(bugId, updates) {
  const bugs = getBugsData();
  const bugIndex = bugs.findIndex((b) => b.id === bugId);

  if (bugIndex === -1) return false;

  // Appliquer les mises à jour
  bugs[bugIndex] = {
    ...bugs[bugIndex],
    ...updates,
  };

  return saveBugsData(bugs);
}

/**
 * ADDED: Supprime un bug
 */
function deleteBug(bugId) {
  const bugs = getBugsData();
  const filteredBugs = bugs.filter((b) => b.id !== bugId);

  if (filteredBugs.length === bugs.length) return false; // Bug non trouvé

  return saveBugsData(filteredBugs);
}

/**
 * ADDED: Change le statut d'un bug (open/cleared)
 */
function toggleBugStatus(bugId) {
  const bugs = getBugsData();
  const bug = bugs.find((b) => b.id === bugId);

  if (!bug) return false;

  const newStatus = bug.status === "open" ? "cleared" : "open";
  const clearedAt = newStatus === "cleared" ? new Date().toISOString() : null;

  return updateBug(bugId, {
    status: newStatus,
    clearedAt: clearedAt,
  });
}

// ============================================
// GESTION CONTACT ET CONDITIONS
// ============================================

/**
 * Récupère les données de contact (localStorage uniquement)
 */
function getContactRequests() {
  const raw = localStorage.getItem(window.LMD.storageKeys.contactRequests);
  if (!raw) {
    return [];
  }
  try {
    const stored = JSON.parse(raw);
    if (Array.isArray(stored)) {
      return stored.map((request) => ({
        ...request,
        // Normaliser les valeurs par défaut
        id: request.id || "",
        email: request.email || "",
        topic: request.topic || "autre",
        page: request.page || "",
        message: request.message || "",
        status: request.status || "new",
        createdAt: request.createdAt || new Date().toISOString(),
      }));
    }
  } catch (e) {
    console.warn("Erreur lors du chargement des demandes de contact:", e);
  }
  return [];
}

/**
 * Sauvegarde les données de contact
 */
function saveContactRequests(requests) {
  try {
    localStorage.setItem(
      window.LMD.storageKeys.contactRequests,
      JSON.stringify(requests),
    );
    return true;
  } catch (e) {
    console.error("Erreur lors de la sauvegarde des demandes de contact:", e);
    return false;
  }
}

/**
 * Ajoute une nouvelle demande de contact
 */
function addContactRequest(requestData) {
  const requests = getContactRequests();
  const newRequest = {
    id: "contact_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    email: requestData.email || "",
    topic: requestData.topic || "autre",
    page: requestData.page || "",
    message: requestData.message || "",
    status: "new",
    createdAt: new Date().toISOString(),
  };

  requests.push(newRequest);
  return saveContactRequests(requests) ? newRequest : null;
}

/**
 * Met à jour une demande de contact
 */
function updateContactRequest(requestId, updates) {
  const requests = getContactRequests();
  const requestIndex = requests.findIndex((r) => r.id === requestId);

  if (requestIndex === -1) return false;

  requests[requestIndex] = {
    ...requests[requestIndex],
    ...updates,
  };

  return saveContactRequests(requests);
}

/**
 * Supprime une demande de contact
 */
function deleteContactRequest(requestId) {
  const requests = getContactRequests();
  const filteredRequests = requests.filter((r) => r.id !== requestId);

  if (filteredRequests.length === requests.length) return false;

  return saveContactRequests(filteredRequests);
}

/**
 * Récupère le texte des conditions générales
 */
function getConditionsText() {
  const raw = localStorage.getItem(window.LMD.storageKeys.conditions);
  if (!raw) {
    // Texte par défaut si rien en localStorage
    return `Conditions générales d'utilisation

1. Acceptation des conditions
En accédant et en utilisant ce site web, vous acceptez d'être lié par ces conditions générales d'utilisation.

2. Utilisation du site
Ce site est destiné à un usage personnel et non commercial. Vous vous engagez à ne pas utiliser ce site pour des activités illégales.

3. Contenu
Le contenu de ce site est fourni à titre informatif uniquement. Nous ne garantissons pas l'exactitude ou l'exhaustivité des informations.

4. Responsabilité
Nous ne pouvons être tenus responsables des dommages directs ou indirects résultant de l'utilisation de ce site.

5. Modification des conditions
Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet immédiatement après leur publication.

6. Contact
Pour toute question concernant ces conditions, veuillez nous contacter via le formulaire de contact.`;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Erreur lors du chargement des conditions:", e);
    return "";
  }
}

/**
 * Sauvegarde le texte des conditions générales
 */
function saveConditionsText(text) {
  try {
    localStorage.setItem(
      window.LMD.storageKeys.conditions,
      JSON.stringify(text),
    );
    return true;
  } catch (e) {
    console.error("Erreur lors de la sauvegarde des conditions:", e);
    return false;
  }
}

// ============================================
// AUTHENTIFICATION FRONT-ONLY
// ============================================

/**
 * Hash simple du mot de passe (base64 - pas sécurisé, simulation uniquement)
 */
function hashPassword(password) {
  try {
    return btoa(password + "salt_le_mont_de_lermite_2026");
  } catch (e) {
    return password; // fallback
  }
}

/**
 * Récupère la liste des utilisateurs
 */
function getAuthUsers() {
  const raw = localStorage.getItem(window.LMD.storageKeys.authUsers);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Erreur chargement utilisateurs:", e);
    return [];
  }
}

/**
 * Sauvegarde la liste des utilisateurs
 */
function saveAuthUsers(users) {
  try {
    localStorage.setItem(
      window.LMD.storageKeys.authUsers,
      JSON.stringify(users),
    );
    return true;
  } catch (e) {
    console.error("Erreur sauvegarde utilisateurs:", e);
    return false;
  }
}


/**
 * Sauvegarde la session utilisateur
 */
function saveAuthSession(user) {
  try {
    localStorage.setItem(
      window.LMD.storageKeys.authSession,
      JSON.stringify(user),
    );
    return true;
  } catch (e) {
    return false;
  }
}


/**
 * Récupère les logs d'authentification
 */
function getAuthLogs() {
  const raw = localStorage.getItem(window.LMD.storageKeys.authLog);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

/**
 * Ajoute un log d'authentification
 */
function addAuthLog(type, pseudo, email) {
  const logs = getAuthLogs();
  logs.push({
    id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    type: type, // 'signup' ou 'login'
    pseudo: pseudo,
    email: email,
    createdAt: new Date().toISOString(),
  });

  try {
    localStorage.setItem(window.LMD.storageKeys.authLog, JSON.stringify(logs));
  } catch (e) {
    console.warn("Erreur sauvegarde log auth:", e);
  }
}

/**
 * Inscription d'un nouvel utilisateur
 */
function signupUser(userData) {
  const users = getAuthUsers();

  // Vérifications
  if (
    users.find((u) => u.pseudo.toLowerCase() === userData.pseudo.toLowerCase())
  ) {
    throw new Error("Ce pseudo est déjà pris");
  }
  if (
    users.find((u) => u.email.toLowerCase() === userData.email.toLowerCase())
  ) {
    throw new Error("Cet email est déjà utilisé");
  }

  const newUser = {
    id: "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    pseudo: userData.pseudo.trim(),
    email: userData.email.toLowerCase().trim(),
    passwordHash: hashPassword(userData.password),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  if (!saveAuthUsers(users)) {
    throw new Error("Erreur lors de la création du compte");
  }

  // Log de l'inscription
  addAuthLog("signup", newUser.pseudo, newUser.email);

  return newUser;
}

/**
 * Connexion d'un utilisateur
 */
function loginUser(identifier, password) {
  const users = getAuthUsers();
  const passwordHash = hashPassword(password);

  // Chercher par email ou pseudo
  const user = users.find(
    (u) =>
      u.email.toLowerCase() === identifier.toLowerCase().trim() ||
      u.pseudo.toLowerCase() === identifier.toLowerCase().trim(),
  );

  if (!user || user.passwordHash !== passwordHash) {
    throw new Error("Identifiant ou mot de passe incorrect");
  }

  // Créer la session
  const sessionUser = {
    id: user.id,
    pseudo: user.pseudo,
    email: user.email,
  };

  if (!saveAuthSession(sessionUser)) {
    throw new Error("Erreur lors de la connexion");
  }

  // Log de la connexion
  addAuthLog("login", user.pseudo, user.email);

  return sessionUser;
}

/**
 * ADDED: Initialise la page contact
 */
function initContactPage() {
  const contactForm = document.getElementById("contactForm");
  const contactSuccess = document.getElementById("contact-success");

  if (!contactForm) return;

  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Réinitialiser les erreurs
    const errorElements = contactForm.querySelectorAll(".form-error");
    errorElements.forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });

    const formData = new FormData(contactForm);
    const contactData = {
      name: formData.get("name")?.trim(),
      email: formData.get("email")?.trim(),
      topic: formData.get("topic"),
      page: formData.get("page")?.trim(),
      message: formData.get("message")?.trim(),
    };

    // Validation
    let hasError = false;

    if (!contactData.email) {
      showFormError("contact-email", "Email requis");
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
      showFormError("contact-email", "Email invalide");
      hasError = true;
    }

    if (!contactData.topic) {
      showFormError("contact-topic", "Sujet requis");
      hasError = true;
    }

    if (!contactData.message) {
      showFormError("contact-message", "Message requis");
      hasError = true;
    }

    if (hasError) return;

    // Sauvegarder la demande
    const newRequest = addContactRequest(contactData);
    if (newRequest) {
      // Masquer le formulaire et afficher le succès
      contactForm.style.display = "none";
      if (contactSuccess) {
        contactSuccess.style.display = "block";
      }

      // Réinitialiser le formulaire pour le cas où l'utilisateur actualise
      contactForm.reset();
    } else {
      alert("Erreur lors de l'envoi de votre demande. Veuillez réessayer.");
    }
  });
}

/**
 * ADDED: Initialise la page conditions
 */
function initConditionsPage() {
  const conditionsTextElement = document.getElementById("conditions-text");
  if (!conditionsTextElement) return;

  // Charger et afficher le texte des conditions
  const conditionsText = getConditionsText();
  if (conditionsText && conditionsText.trim()) {
    // Si du texte personnalisé existe, l'afficher avec formatage basique
    conditionsTextElement.innerHTML = formatConditionsText(conditionsText);
  } else {
    // Afficher le contenu par défaut bien structuré
    conditionsTextElement.innerHTML = getDefaultConditionsHTML();
  }
}

/**
 * ADDED: Initialise la page login
 */
function initLoginPage() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Réinitialiser les erreurs
    const errorElements = loginForm.querySelectorAll(".form-error");
    errorElements.forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });

    const formData = new FormData(loginForm);
    const identifier = formData.get("identifier")?.trim();
    const password = formData.get("password");

    if (!identifier || !password) {
      showFormError("login-identifier", "Tous les champs sont requis");
      return;
    }

    try {
      const user = loginUser(identifier, password);
      // Redirection vers index.html
      window.location.href = "index.html";
    } catch (error) {
      showFormError("login-identifier", error.message);
    }
  });
}

/**
 * ADDED: Initialise la page signup
 */
function initSignupPage() {
  const signupForm = document.getElementById("signupForm");
  if (!signupForm) return;

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Réinitialiser les erreurs
    const errorElements = signupForm.querySelectorAll(".form-error");
    errorElements.forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });

    const formData = new FormData(signupForm);
    const userData = {
      pseudo: formData.get("pseudo")?.trim(),
      email: formData.get("email")?.trim(),
      password: formData.get("password"),
      passwordConfirm: formData.get("passwordConfirm"),
    };

    // Validation
    if (
      !userData.pseudo ||
      !userData.email ||
      !userData.password ||
      !userData.passwordConfirm
    ) {
      showFormError("signup-pseudo", "Tous les champs sont requis");
      return;
    }

    if (userData.pseudo.length < 3) {
      showFormError(
        "signup-pseudo",
        "Le pseudo doit contenir au moins 3 caractères",
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      showFormError("signup-email", "Format d'email invalide");
      return;
    }

    if (userData.password.length < 6) {
      showFormError(
        "signup-password",
        "Le mot de passe doit contenir au moins 6 caractères",
      );
      return;
    }

    if (userData.password !== userData.passwordConfirm) {
      showFormError(
        "signup-password-confirm",
        "Les mots de passe ne correspondent pas",
      );
      return;
    }

    try {
      const user = signupUser(userData);
      // Afficher message de succès et lien vers login
      signupForm.style.display = "none";
      const successMessage = document.createElement("div");
      successMessage.className = "auth-success";
      successMessage.innerHTML = `
                <div class="success-icon">✓</div>
                <h3>Compte créé avec succès !</h3>
                <p>Votre compte a été créé. Vous pouvez maintenant vous connecter.</p>
                <a href="login.html" class="btn btn-primary" style="margin-top: var(--spacing-lg);">Se connecter</a>
            `;

      const authCard = signupForm.closest(".auth-card");
      if (authCard) {
        authCard.appendChild(successMessage);
      }
    } catch (error) {
      if (error.message.includes("pseudo")) {
        showFormError("signup-pseudo", error.message);
      } else if (error.message.includes("email")) {
        showFormError("signup-email", error.message);
      } else {
        showFormError("signup-pseudo", error.message);
      }
    }
  });
}

/**
 * Formate le texte des conditions pour l'affichage HTML
 */
function formatConditionsText(text) {
  if (!text) return "";

  // Si le texte contient déjà des balises HTML, l'utiliser tel quel
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  // Sinon, appliquer un formatage basique
  // Convertir les sauts de ligne en paragraphes
  const paragraphs = text.split("\n\n").filter((p) => p.trim());
  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      // Détecter les titres (lignes commençant par des chiffres ou des mots-clés)
      if (
        /^\d+\./.test(trimmed) ||
        /^(Objet|Accès|Contenus|Responsabilité|Liens|Propriété|Signalement|Modification|Droit)/i.test(
          trimmed,
        )
      ) {
        return `<h2>${trimmed}</h2>`;
      }
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

/**
 * Retourne le contenu HTML par défaut des conditions générales
 */
function getDefaultConditionsHTML() {
  return `
        <section class="conditions-section">
            <h2>1. Objet</h2>
            <p>Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation du site web LE MONT DE LERMITE. En accédant à ce site, vous acceptez d'être lié par ces conditions.</p>
        </section>

        <section class="conditions-section">
            <h2>2. Accès au site</h2>
            <p>Le site est accessible gratuitement à tout utilisateur disposant d'un accès internet. Tous les frais supportés par l'utilisateur pour accéder au service (matériel informatique, logiciels, connexion internet, etc.) sont à sa charge.</p>
        </section>

        <section class="conditions-section">
            <h2>3. Contenus et fonctionnalités</h2>
            <p>Le site propose des informations sur les jeux vidéo, des actualités, des tests et des guides. Le contenu est fourni à titre informatif uniquement.</p>
            <ul>
                <li>Les informations présentées ne constituent pas un conseil d'achat</li>
                <li>Les tests et avis sont subjectifs et personnels</li>
                <li>Le contenu peut être modifié sans préavis</li>
            </ul>
        </section>

        <section class="conditions-section">
            <h2>4. Responsabilité</h2>
            <p>Nous mettons tout en œuvre pour assurer l'exactitude des informations publiées. Cependant, nous ne pouvons garantir l'absence d'erreurs ou d'omissions.</p>
            <p>Nous déclinons toute responsabilité quant aux dommages directs ou indirects pouvant survenir suite à l'utilisation du site.</p>
        </section>

        <section class="conditions-section">
            <h2>5. Liens externes et affiliation</h2>
            <p>Le site peut contenir des liens vers des sites externes ou des offres partenaires. Nous ne contrôlons pas ces sites et déclinons toute responsabilité quant à leur contenu ou leur politique de confidentialité.</p>
            <p>Certaines offres peuvent inclure des liens d'affiliation rémunérés.</p>
        </section>

        <section class="conditions-section">
            <h2>6. Propriété intellectuelle</h2>
            <p>Le contenu du site (textes, images, vidéos, logos) est protégé par le droit d'auteur. Toute reproduction, distribution ou exploitation commerciale sans autorisation préalable est interdite.</p>
        </section>

        <section class="conditions-section">
            <h2>7. Signalement et contact</h2>
            <p>Pour signaler un contenu inapproprié, un bug ou toute autre demande, utilisez le formulaire de contact disponible sur le site.</p>
            <p>Nous nous efforçons de répondre dans les meilleurs délais.</p>
        </section>

        <section class="conditions-section">
            <h2>8. Modification des conditions</h2>
            <p>Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prennent effet immédiatement après leur publication sur le site.</p>
            <p>Il est recommandé de consulter régulièrement cette page.</p>
        </section>

        <section class="conditions-section">
            <h2>9. Droit applicable</h2>
            <p>Ces conditions sont régies par le droit français. En cas de litige, les tribunaux français seront seuls compétents.</p>
        </section>

        <div class="conditions-footer">
            <p><em>Dernière mise à jour : ${new Date().toLocaleDateString("fr-FR")}</em></p>
            <p><em>Version 1.0 - Conditions générales d'utilisation</em></p>
        </div>
    `;
}

/**
 * Rend la page bons-plans avec mosaïque de bons plans
 */
function renderBonsPlansPage() {
  const container = document.getElementById("articlesGrid");
  if (!container) return;

  const bonsPlans = getBonsPlansData();
  debugLog("DATA", { bonsPlansLoaded: bonsPlans.length });

  // Fonction pour rendre un bon plan individuel
  function renderBonPlanItem(bonPlan) {
    // Calculer la réduction
    let discountBadge = "";
    if (bonPlan.discountPercent && bonPlan.discountPercent > 0) {
      discountBadge = `<span class="discount-badge">-${bonPlan.discountPercent}%</span>`;
    } else if (
      bonPlan.oldPrice &&
      bonPlan.price &&
      bonPlan.oldPrice > bonPlan.price
    ) {
      const percent = Math.round((1 - bonPlan.price / bonPlan.oldPrice) * 100);
      if (percent > 0) {
        discountBadge = `<span class="discount-badge">-${percent}%</span>`;
      }
    }

    // Prix formaté
    let priceDisplay = "";
    if (bonPlan.price !== null && bonPlan.price !== undefined) {
      priceDisplay = `<span class="current-price">${bonPlan.price.toFixed(2)}€</span>`;
      if (bonPlan.oldPrice && bonPlan.oldPrice > bonPlan.price) {
        priceDisplay += ` <span class="old-price">${bonPlan.oldPrice.toFixed(2)}€</span>`;
      }
    }

    // Image de couverture
    const imageHtml =
      bonPlan.coverUrl && bonPlan.coverUrl.trim()
        ? `<div class="bon-plan-image" style="background-image: url('${escapeHtml(bonPlan.coverUrl)}');">${discountBadge}</div>`
        : `<div class="bon-plan-image placeholder-image">${discountBadge}</div>`;

    // Lien externe
    const linkAttrs = bonPlan.externalUrl
      ? `href="${escapeHtml(bonPlan.externalUrl)}" ${bonPlan.openInNewTab ? 'target="_blank" rel="noopener"' : ""}`
      : "#";

    return `
            <article class="bon-plan-card">
                <a ${linkAttrs} class="bon-plan-link">
                    ${imageHtml}
                    <div class="bon-plan-content">
                        ${bonPlan.merchant ? `<span class="merchant-tag">${escapeHtml(bonPlan.merchant)}</span>` : ""}
                        <h3 class="bon-plan-title">${escapeHtml(bonPlan.title || "Bon plan sans titre")}</h3>
                        ${bonPlan.excerpt ? `<p class="bon-plan-excerpt">${escapeHtml(bonPlan.excerpt)}</p>` : ""}
                        ${priceDisplay ? `<div class="bon-plan-pricing">${priceDisplay}</div>` : ""}
                        <div class="bon-plan-meta">
                            ${bonPlan.publishedAt ? `<span class="date">${new Date(bonPlan.publishedAt).toLocaleDateString("fr-FR")}</span>` : ""}
                            <span class="cta">Voir l'offre →</span>
                        </div>
                    </div>
                </a>
            </article>
        `;
  }

  // Wrapper premium pour la grille
  ensurePremiumPanel(container, {
    title: "Bons plans",
    subtitle: "Les meilleures offres gaming",
  });

  // Utiliser la pagination pour les bons plans
  if (bonsPlans.length > 0) {
    // Trouver ou créer le conteneur pagination
    let pagerEl = container.nextElementSibling;
    if (!pagerEl || !pagerEl.classList.contains("pagination")) {
      pagerEl = document.createElement("div");
      pagerEl.className = "pagination";
      container.parentNode.insertBefore(pagerEl, container.nextSibling);
    }

    initGridPagination({
      gridEl: container,
      pagerEl: pagerEl,
      items: bonsPlans,
      pageSize: 12,
      renderItem: renderBonPlanItem,
      key: "bons-plans",
    });
  } else {
    // Aucun bon plan : afficher le message vide
    container.innerHTML = `
            <div class="articles-empty">
                <p>Aucun bon plan disponible pour le moment.</p>
                <p>Revenez bientôt pour découvrir nos meilleures offres !</p>
            </div>
        `;
  }
}

/**
 * Récupère les données des bons plans (base + override)
 */
function getBonsPlansData() {
  const override = getBonsPlansOverride();
  const bonsPlans = override || window.BASE_BONS_PLANS || [];

  // Créer une copie pour éviter de muter les données originales
  const hydratedBonsPlans = Array.isArray(bonsPlans) ? [...bonsPlans] : [];

  // Normalisation des données
  hydratedBonsPlans.forEach((bonPlan) => {
    // Valeurs par défaut
    if (!bonPlan.title) bonPlan.title = "";
    if (!bonPlan.excerpt) bonPlan.excerpt = "";
    if (!bonPlan.coverUrl) bonPlan.coverUrl = "";
    if (!bonPlan.externalUrl) bonPlan.externalUrl = "";
    if (!bonPlan.merchant) bonPlan.merchant = "";
    if (!bonPlan.slug) bonPlan.slug = "";
    if (!bonPlan.publishedAt) bonPlan.publishedAt = "";
    if (!Array.isArray(bonPlan.contentBlocks)) bonPlan.contentBlocks = [];
    if (typeof bonPlan.price !== "number") bonPlan.price = null;
    if (typeof bonPlan.oldPrice !== "number") bonPlan.oldPrice = null;
    if (typeof bonPlan.discountPercent !== "number")
      bonPlan.discountPercent = null;
    if (typeof bonPlan.isFeatured !== "boolean") bonPlan.isFeatured = false;
    if (typeof bonPlan.openInNewTab !== "boolean") bonPlan.openInNewTab = true;

    // Générer slug si manquant
    if (!bonPlan.slug && bonPlan.title) {
      bonPlan.slug = slugify(bonPlan.title);
    }
  });

  // Trier : mis en avant en premier, puis par date décroissante
  return hydratedBonsPlans.sort((a, b) => {
    // Mis en avant d'abord
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;

    // Puis par date décroissante
    const dateA = new Date(a.publishedAt || a.updatedAt || "1970-01-01");
    const dateB = new Date(b.publishedAt || b.updatedAt || "1970-01-01");
    return dateB - dateA;
  });
}

/**
 * Charge les overrides bons plans depuis localStorage
 */
function getBonsPlansOverride() {
  try {
    const stored = localStorage.getItem(window.LMD.storageKeys.bonsplans);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn("[getBonsPlansOverride] Erreur chargement override:", e);
    return null;
  }
}

/**
 * Sauvegarde les overrides bons plans dans localStorage
 */
function saveBonsPlansOverride(data) {
  try {
    localStorage.setItem(
      window.LMD.storageKeys.bonsplans,
      JSON.stringify(data),
    );
    debugLog("DATA", { bonsPlansOverrideSaved: data.length });
  } catch (e) {
    console.error("[saveBonsPlansOverride] Erreur sauvegarde:", e);
  }
}

/**
 * ADDED: Normalise et valide les données d'un test depuis le formulaire
 */
function normalizeTestPayload(formData) {
  const id = (formData.get("id") || "").trim();
  const title = (formData.get("title") || "").trim();
  const gameId = (formData.get("gameId") || "").trim();
  const coverUrl = (formData.get("coverUrl") || "").trim();
  const excerpt = (formData.get("excerpt") || "").trim();
  const publishedAt = (formData.get("publishedAt") || "").trim();
  const isFeatured = formData.get("isFeatured") === "on";

  // Générer ID si nouveau test
  let finalId = id;
  if (!finalId) {
    const baseSlug = slugify(title);
    finalId = generateId(getTestsData(), baseSlug);
  }

  // Générer slug si manquant
  let slug = (formData.get("slug") || "").trim();
  if (!slug && title) {
    slug = slugify(title);
    // Assurer l'unicité du slug
    const existingTests = getTestsData().filter((t) => t.id !== finalId);
    let uniqueSlug = slug;
    let counter = 1;
    while (existingTests.some((t) => t.slug === uniqueSlug)) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
    slug = uniqueSlug;
  }

  // Lire les blocs depuis testBlocks (synchronisés depuis le DOM)
  const contentBlocks = readTestBlocks();

  // Récupérer les critères
  const criteria = [];
  let criteriaIndex = 0;
  while (true) {
    const label = formData.get(`criteria[${criteriaIndex}][label]`);
    const scoreStr = formData.get(`criteria[${criteriaIndex}][score]`);

    if (!label && !scoreStr) break; // Plus de critères

    const labelTrimmed = (label || "").trim();
    const score = parseFloat(scoreStr || "0");

    if (labelTrimmed && !isNaN(score) && score >= 0 && score <= 10) {
      criteria.push({
        label: labelTrimmed,
        score: score,
      });
    }

    criteriaIndex++;
  }

  // Calculer le score moyen si des critères sont présents
  let score = 0;
  if (criteria.length > 0) {
    score = criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length;
  }

  // Validations
  if (!title) {
    throw new Error("Le titre du test est obligatoire");
  }

  return {
    id: finalId,
    slug,
    title,
    gameId,
    gameTitle: "", // Sera rempli automatiquement dans getTestsData
    coverUrl,
    excerpt,
    contentBlocks,
    score,
    criteria,
    platforms: [], // TODO: ajouter gestion des plateformes si nécessaire
    publishedAt,
    isFeatured,
  };
}

/**
 * ADDED: Upsert un test (ajout/modification)
 */
function upsertTest(test) {
  const tests = getTestsData();
  const existingIndex = tests.findIndex((t) => t.id === test.id);

  if (existingIndex >= 0) {
    // Modification
    tests[existingIndex] = { ...tests[existingIndex], ...test };
  } else {
    // Ajout
    tests.push(test);
  }

  return saveTestsOverride(tests);
}

/**
 * ADDED: Supprime un test
 */
function deleteTest(testId) {
  const tests = getTestsData();
  const filteredTests = tests.filter((t) => t.id !== testId);
  return saveTestsOverride(filteredTests);
}

// ============================================
// ADDED: GESTION SPONSORS (localStorage)
// ============================================

// Toutes les clés sont déjà définies dans window.LMD.storageKeys

/**
 * ADDED: Lit les sponsors depuis localStorage
 */
function getSponsorsData() {
  const raw = localStorage.getItem(window.LMD.storageKeys.sponsors);
  console.log(
    "[DEBUG] getSponsorsData - key:",
    window.LMD.storageKeys.sponsors,
    "raw:",
    raw,
  );
  if (!raw) {
    console.log("[DEBUG] getSponsorsData - no data in localStorage");
    return { items: [] };
  }
  try {
    const stored = JSON.parse(raw);
    console.log("[DEBUG] getSponsorsData - parsed data:", stored);
    if (stored && Array.isArray(stored.items)) {
      return stored;
    }
  } catch (e) {
    console.warn("Erreur lors de la lecture des sponsors:", e);
  }
  return { items: [] };
}

/**
 * ADDED: Sauvegarde les sponsors dans localStorage
 */
function saveSponsorsData(data) {
  try {
    localStorage.setItem(window.LMD.storageKeys.sponsors, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Erreur lors de la sauvegarde des sponsors:", e);
    return false;
  }
}

/**
 * ADDED: Normalise et valide les données d'un sponsor depuis le formulaire
 */
function normalizeSponsorPayload(formData) {
  const title = (formData.get("title") || "").trim();
  const subtitle = (formData.get("subtitle") || "").trim();
  const imageUrl = (formData.get("imageUrl") || "").trim();
  const ctaText = (formData.get("ctaText") || "Découvrir").trim();
  const ctaUrl = (formData.get("ctaUrl") || "").trim();
  const openNewTab = formData.get("openNewTab") === "on";
  const active = formData.get("active") !== "off"; // true par défaut si non fourni
  const startAt = (formData.get("startAt") || "").trim();
  const endAt = (formData.get("endAt") || "").trim();

  // Validations
  if (!title) {
    throw new Error("Le titre est obligatoire");
  }
  if (!ctaUrl) {
    throw new Error("L'URL du CTA est obligatoire");
  }
  try {
    new URL(ctaUrl);
  } catch (e) {
    throw new Error("L'URL du CTA n'est pas valide");
  }
  if (imageUrl) {
    try {
      new URL(imageUrl);
    } catch (e) {
      throw new Error("L'URL de l'image n'est pas valide");
    }
  }
  if (startAt && endAt && new Date(startAt) > new Date(endAt)) {
    throw new Error("La date de fin doit être après la date de début");
  }

  const id =
    formData.get("id") ||
    `spon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    title,
    subtitle,
    imageUrl,
    ctaText,
    ctaUrl,
    openNewTab,
    active,
    startAt: startAt || null,
    endAt: endAt || null,
    createdAt: formData.get("createdAt") || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * ADDED: Sélectionne le sponsor actif et valide (dates)
 */
function pickActiveSponsor(items, now = new Date()) {
  if (!Array.isArray(items)) return null;

  // Trier par date de création (plus récent en premier)
  const sortedItems = [...items].sort((a, b) => {
    const aDate = a.createdAt || a.updatedAt || "";
    const bDate = b.createdAt || b.updatedAt || "";
    return bDate.localeCompare(aDate);
  });

  // Trouver le premier sponsor actif et valide pour les dates
  for (const item of sortedItems) {
    console.log(
      "[DEBUG] Checking sponsor:",
      item.title,
      "active:",
      item.active,
    );
    if (!item.active) {
      console.log("[DEBUG] Sponsor not active, skipping");
      continue;
    }

    const startAt = item.startAt ? new Date(item.startAt) : null;
    const endAt = item.endAt ? new Date(item.endAt) : null;

    console.log(
      "[DEBUG] Dates - startAt:",
      startAt,
      "endAt:",
      endAt,
      "now:",
      now,
    );

    // Vérifier les dates
    if (startAt && now < startAt) {
      console.log("[DEBUG] Not yet started");
      continue; // Pas encore commencé
    }
    if (endAt && now > endAt) {
      console.log("[DEBUG] Expired");
      continue; // Expiré
    }

    console.log("[DEBUG] Found active sponsor:", item.title);
    return item;
  }

  return null;
}

// ============================================
// ADDED: GESTION TESTS (CRUD + UI)
// ============================================

/**
 * ADDED: Ouvre le modal test
 */
function openTestModal(mode = "create", test = null) {
  const { modal, refs } = ensureTestModal();

  if (!modal || !refs.title || !refs.form) {
    console.error("[ERROR] Modal test ou éléments essentiels manquants");
    return;
  }

  // Remplir le select des jeux AVANT de définir les valeurs
  const games = getGamesData();
  if (refs.gameId) {
    refs.gameId.innerHTML = '<option value="">Sélectionner un jeu...</option>';
    games.forEach((game) => {
      const option = document.createElement("option");
      option.value = game.id;
      option.textContent = game.title;
      refs.gameId.appendChild(option);
    });
  }

  clearTestFormErrors();

  if (mode === "create") {
    refs.title.textContent = "Ajouter un test";
    refs.form.reset();
    if (refs.id) refs.id.value = "";
    updateTestCoverPreview("");
    // Initialiser les blocs vides
    testBlocks = [];
    renderTestBlocks(testBlocks);
    // Initialiser avec un critère vide
    renderTestCriteria([]);
    updateTestAverageScore();
  } else if (mode === "edit" && test) {
    refs.title.textContent = "Modifier un test";
    populateTestForm(refs, test);
  }

  // Afficher les médias récents sous le champ cover
  renderRecentMedia("test");

  modal.classList.add("is-open");

  // Focus sur le premier champ
  const firstInput = refs.form.querySelector('input[type="text"]');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

/**
 * ADDED: Ferme le modal test
 */
function closeTestModal() {
  const modal = document.getElementById("testModal");
  if (modal) {
    modal.classList.remove("is-open");
    clearTestFormErrors();
    const form = document.getElementById("testForm");
    if (form) {
      form.reset();
    }
    // Reset preview cover
    const previewImg = document.getElementById("testCoverPreviewImg");
    const previewPlaceholder = document.getElementById(
      "testCoverPreviewPlaceholder",
    );
    const coverError = document.getElementById("error-test-cover");
    if (previewImg) {
      previewImg.style.display = "none";
      previewImg.src = "";
    }
    if (previewPlaceholder) {
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Aperçu indisponible";
    }
    if (coverError) {
      coverError.textContent = "";
    }
  }
}

/**
 * ADDED: Remplit le formulaire test avec les données
 */
// Ancienne fonction remplacée par populateTestForm (plus sécurisée)
// Gardée pour compatibilité mais utilise maintenant populateTestForm
function fillTestForm(test) {
  const { modal, refs } = ensureTestModal();
  if (!modal) {
    console.error("[ERROR] Modal test non trouvé dans le DOM");
    return;
  }
  populateTestForm(refs, test);
}

/**
 * ADDED: Rend la liste des critères dans le formulaire
 */
function renderTestCriteria(criteria) {
  const container = document.getElementById("test-criteria-list");
  if (!container) return;

  if (criteria.length === 0) {
    container.innerHTML =
      '<div class="criteria-empty">Aucun critère défini</div>';
    return;
  }

  container.innerHTML = criteria
    .map(
      (criterion, index) => `
        <div class="criterion-item" data-index="${index}">
            <input type="text" name="criteria[${index}][label]" value="${criterion.label || ""}" placeholder="Nom du critère" required>
            <input type="number" name="criteria[${index}][score]" value="${criterion.score || 0}" min="0" max="10" step="0.1" required>
            <button type="button" class="btn btn-danger btn-remove-criterion" data-index="${index}">×</button>
        </div>
    `,
    )
    .join("");

  // Ajouter les gestionnaires d'événements
  container.querySelectorAll(".btn-remove-criterion").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      criteria.splice(index, 1);
      renderTestCriteria(criteria);
      updateTestAverageScore();
    });
  });

  // Écouter les changements pour recalculer la moyenne
  container.querySelectorAll('input[name*="[score]"]').forEach((input) => {
    input.addEventListener("input", updateTestAverageScore);
  });
}

/**
 * ADDED: Met à jour l'affichage du score moyen
 */
function updateTestAverageScore() {
  const scoreInputs = document.querySelectorAll('input[name*="[score]"]');
  const scores = Array.from(scoreInputs)
    .map((input) => parseFloat(input.value) || 0)
    .filter((score) => score >= 0 && score <= 10);

  const average =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const display = document.getElementById("test-average-score-value");
  if (display) {
    display.textContent = average.toFixed(1);
  }
}

/**
 * ADDED: Affiche les erreurs de validation test
 */
function showTestFormErrors(errors) {
  Object.keys(errors).forEach((field) => {
    const input = document.getElementById(`test-${field}`);
    const errorEl = document.getElementById(`error-test-${field}`);

    if (input) {
      input.classList.add("invalid", "is-invalid");
    }

    if (errorEl) {
      errorEl.textContent = errors[field];
    }
  });
}

/**
 * ADDED: Efface les erreurs du formulaire test
 */
function clearTestFormErrors() {
  const inputs = document.querySelectorAll(
    "#testForm .invalid, #testForm .is-invalid",
  );
  inputs.forEach((input) => {
    input.classList.remove("invalid", "is-invalid");
  });

  const errors = document.querySelectorAll("#testForm .form-error");
  errors.forEach((error) => {
    error.textContent = "";
  });
}

/**
 * ADDED: Met à jour le preview de l'image cover test
 */
function updateTestCoverPreview(url) {
  const previewImg = document.getElementById("testCoverPreviewImg");
  const previewPlaceholder = document.getElementById(
    "testCoverPreviewPlaceholder",
  );

  if (!previewImg || !previewPlaceholder) return;

  if (url && url.trim()) {
    previewImg.src = url;
    previewImg.style.display = "block";
    previewPlaceholder.style.display = "none";
  } else {
    previewImg.style.display = "none";
    previewImg.src = "";
    previewPlaceholder.style.display = "block";
    previewPlaceholder.textContent = "Aperçu indisponible";
  }
}

// ============================================
// ADDED: GESTION MÉDIAS (localStorage)
// ============================================

/**
 * ADDED: Lit les médias depuis localStorage (retourne [] si vide/invalid)
 */
function getMediaData() {
  const raw = localStorage.getItem(window.LMD.storageKeys.media);
  if (!raw) {
    return [];
  }
  try {
    const stored = JSON.parse(raw);
    if (Array.isArray(stored)) {
      // ADDED: Normaliser le champ folder (par défaut "Non classé")
      return stored.map((media) => ({
        ...media,
        folder: toText(media.folder) || "Non classé",
      }));
    }
  } catch (e) {
    // Fallback silencieux (zéro console error)
  }
  return [];
}

/**
 * ADDED: Écrit les médias dans localStorage
 */
function saveMediaData(mediaList) {
  try {
    localStorage.setItem(
      window.LMD.storageKeys.media,
      JSON.stringify(mediaList),
    );
  } catch (e) {
    // Fallback silencieux (zéro console error)
    throw new Error("Impossible de sauvegarder les médias");
  }
}

/**
 * ADDED: Récupère la liste des dossiers vides
 */
function getMediaFolders() {
  const raw = localStorage.getItem(window.LMD.storageKeys.mediaFolders);
  if (!raw) {
    return [];
  }
  try {
    const stored = JSON.parse(raw);
    if (Array.isArray(stored)) {
      return stored;
    }
  } catch (e) {
    // Fallback silencieux (zéro console error)
  }
  return [];
}

/**
 * ADDED: Sauvegarde la liste des dossiers vides
 */
function saveMediaFolders(folders) {
  try {
    localStorage.setItem(
      window.LMD.storageKeys.mediaFolders,
      JSON.stringify(folders),
    );
  } catch (e) {
    // Fallback silencieux (zéro console error)
  }
}

/**
 * ADDED: Récupère tous les dossiers (union des dossiers vides + dossiers des médias + "Non classé")
 */
function getAllMediaFolders() {
  const folders = new Set();

  // Ajouter "Non classé" (toujours présent)
  folders.add("Non classé");

  // Ajouter les dossiers vides
  const emptyFolders = getMediaFolders();
  emptyFolders.forEach((f) => folders.add(f));

  // Ajouter les dossiers des médias
  const mediaList = getMediaData();
  mediaList.forEach((media) => {
    const folder = toText(media.folder) || "Non classé";
    folders.add(folder);
  });

  // Trier (sauf "Non classé" qui reste en premier)
  const sorted = Array.from(folders).sort((a, b) => {
    if (a === "Non classé") return -1;
    if (b === "Non classé") return 1;
    return a.localeCompare(b);
  });

  return sorted;
}

/**
 * ADDED: Met à jour lastUsedAt d'un média quand il est utilisé
 */
function updateMediaLastUsed(url) {
  if (!url) return;
  const mediaList = getMediaData();
  const media = mediaList.find((m) => toText(m.url) === toText(url));
  if (media) {
    media.lastUsedAt = new Date().toISOString();
    saveMediaData(mediaList);
  }
}

/**
 * ADDED: Récupère les médias récemment utilisés
 */
function getRecentMedia(limit = 5) {
  const mediaList = getMediaData();
  // Filtrer les médias qui ont un lastUsedAt
  const withLastUsed = mediaList.filter((m) => m.lastUsedAt);
  // Trier par lastUsedAt desc
  const sorted = withLastUsed.sort((a, b) => {
    const dateA = new Date(a.lastUsedAt || 0);
    const dateB = new Date(b.lastUsedAt || 0);
    return dateB - dateA;
  });
  // Retourner les X premiers
  return sorted.slice(0, limit);
}

/**
 * ADDED: Affiche les médias récents sous le champ cover
 */
function renderRecentMedia(type) {
  const recentMedia = getRecentMedia(5);
  if (recentMedia.length === 0) return;

  // Trouver le container du champ cover
  let coverContainer = null;
  if (type === "game") {
    const coverInput = document.getElementById("game-cover");
    if (coverInput) {
      coverContainer = coverInput.closest(".form-group");
    }
  } else if (type === "article") {
    const coverInput = document.getElementById("article-cover");
    if (coverInput) {
      coverContainer = coverInput.closest(".form-group");
    }
  }

  if (!coverContainer) return;

  // Supprimer l'ancienne zone si elle existe
  const existingZone = coverContainer.querySelector(".recent-media-zone");
  if (existingZone) {
    existingZone.remove();
  }

  // Créer la zone des médias récents
  const zone = document.createElement("div");
  zone.className = "recent-media-zone";
  zone.style.marginTop = "var(--spacing-sm)";
  zone.innerHTML = `
        <div style="font-size: 0.875em; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs);">Médias récents</div>
        <div class="recent-media-list" style="display: flex; gap: var(--spacing-xs); flex-wrap: wrap;">
            ${recentMedia
              .map((media) => {
                const url = toText(media.url);
                return `
                    <div class="recent-media-item" data-media-url="${url}" style="width: 60px; height: 60px; border-radius: var(--radius-sm); overflow: hidden; cursor: pointer; border: 1px solid var(--color-border); transition: all var(--transition-base); opacity: 0.85;" title="${url}" onmouseover="this.style.opacity='1'; this.style.borderColor='rgba(59,130,246,0.5)';" onmouseout="this.style.opacity='0.85'; this.style.borderColor='var(--color-border)';">
                        <img src="${url}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.parentElement.style.display='none';">
                    </div>
                `;
              })
              .join("")}
        </div>
    `;

  // Insérer après le preview
  const preview = coverContainer.querySelector(".image-preview");
  if (preview) {
    preview.after(zone);
  } else {
    // Sinon, insérer à la fin du form-group
    coverContainer.appendChild(zone);
  }

  // ADDED: Event delegation pour les clics sur les miniatures
  zone.addEventListener("click", function (e) {
    const item = e.target.closest(".recent-media-item");
    if (!item) return;

    const url = item.dataset.mediaUrl;
    if (!url) return;

    if (type === "game") {
      const coverInput = document.getElementById("game-cover");
      if (coverInput) {
        coverInput.value = url;
        updateCoverPreview(url);
      }
    } else if (type === "article") {
      const coverInput = document.getElementById("article-cover");
      if (coverInput) {
        coverInput.value = url;
        updateArticleCoverPreview(url);
      }
    }

    // ADDED: Mettre à jour lastUsedAt
    updateMediaLastUsed(url);

    e.preventDefault();
    e.stopPropagation();
  });
}

/**
 * Initialise la page admin (modal, boutons, etc.)
 * Appelée UNIQUEMENT si on est sur la page admin
 */
function initAdminPage() {
  // Vérifier qu'on est bien sur la page admin
  if (document.body?.dataset?.page !== "admin") {
    return; // Pas sur admin, on ne fait rien
  }

  console.log(
    "initAdminPage: Event listeners pour blocs articles seront installés",
  ); // DEBUG

  const modal = document.getElementById("gameModal");
  const btnAdd = document.getElementById("btn-add-game");
  const btnCancel = document.getElementById("btn-cancel-modal");
  const btnClose = document.getElementById("modalCloseBtn");
  const overlay = document.getElementById("modalOverlay");
  const form = document.getElementById("gameForm");

  if (!modal || !btnAdd || !form) {
    console.warn("Éléments admin manquants");
    return;
  }

  // Ouvrir modal pour création
  if (btnAdd) {
    btnAdd.addEventListener("click", () => openGameModal("create"));
  }

  // Fermer modal
  const closeModal = () => closeGameModal();
  if (btnCancel) btnCancel.addEventListener("click", closeModal);
  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (overlay) overlay.addEventListener("click", closeModal);

  // Soumission du formulaire
  form.addEventListener("submit", handleFormSubmit);

  // ADDED: Effacer erreurs à la saisie (UX améliorée)
  const formInputs = form.querySelectorAll("input, textarea, select");
  formInputs.forEach((input) => {
    input.addEventListener("input", function () {
      const fieldName = this.name || this.id.replace("game-", "");
      if (fieldName) {
        clearFieldError(fieldName);
      }

      // ADDED: Mettre à jour le preview de l'image cover en temps réel
      if (this.id === "game-cover") {
        updateCoverPreview(this.value);
      }
    });
  });

  // ADDED: Fermer modal avec Esc
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeGameModal();
    }
  });

  // ADDED: Délégation d'événements robuste pour les boutons "Modifier" et "Supprimer"
  const list = document.getElementById("adminGamesList");
  if (list) {
    // Utiliser le container parent pour une délégation plus robuste
    list.addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit]");
      const deleteBtn = e.target.closest("[data-delete]");

      if (editBtn) {
        const gameId = editBtn.dataset.edit;
        if (gameId) {
          editGame(gameId);
        }
      }

      if (deleteBtn) {
        const gameId = deleteBtn.dataset.delete;
        if (gameId && confirm("Êtes-vous sûr de vouloir supprimer ce jeu ?")) {
          deleteGame(gameId);
        }
      }
    });
  }

  // ADDED: Handler pour le bouton "Réinitialiser (data.js)"
  const btnReset = document.getElementById("btn-reset-data");
  if (btnReset) {
    btnReset.addEventListener("click", function () {
      if (
        confirm(
          "Êtes-vous sûr de vouloir réinitialiser ? Tous les jeux modifiés/ajoutés seront perdus.",
        )
      ) {
        // ADDED: Supprimer la clé override localStorage
        localStorage.removeItem(window.LMD.storageKeys.games);
        // ADDED: Rerender depuis getGamesData() (qui retournera window.GAMES)
        renderAdminGamesList();
      }
    });
  }

  // Fonction unique source de vérité pour gérer les onglets de manière exclusive
  function setAdminTab(key) {
    // Récupérer tous les tabs et sections
    const tabs = Array.from(
      document.querySelectorAll(".admin-tab[data-admin-tab]"),
    );
    const sections = Array.from(
      document.querySelectorAll(".admin-section[data-admin-section]"),
    );

    // 1) Désactiver tous les tabs
    tabs.forEach((tab) => {
      tab.classList.remove("active");
      tab.setAttribute("aria-selected", "false");
      tab.removeAttribute("aria-current");
    });

    // 2) Cacher toutes les sections
    sections.forEach((section) => section.classList.add("is-hidden"));

    // 3) Activer le bon tab + afficher la bonne section
    const targetTab = tabs.find((t) => t.dataset.adminTab === key);
    const targetSection = sections.find((s) => s.dataset.adminSection === key);

    // Fallback sur "games" si section manquante
    let finalKey = key;
    let finalTab = targetTab;
    let finalSection = targetSection;

    if (!finalSection) {
      console.warn(
        "[ADMIN TABS] missing section for key",
        key,
        "- fallback to games",
      );
      finalKey = "games";
      finalTab = tabs.find((t) => t.dataset.adminTab === "games");
      finalSection = sections.find((s) => s.dataset.adminSection === "games");
    }

    // Appliquer l'état actif
    if (finalTab) {
      finalTab.classList.add("active");
      finalTab.setAttribute("aria-selected", "true");
      finalTab.setAttribute("aria-current", "page");
    }
    if (finalSection) {
      finalSection.classList.remove("is-hidden");

      // FIX: Re-render le contenu de la section quand elle devient active
      try {
        if (finalKey === "games") {
          renderAdminGamesList();
        } else if (finalKey === "articles") {
          renderAdminArticlesList();
        } else if (finalKey === "tests") {
          renderAdminTestsList();
        } else if (finalKey === "bons-plans") {
          renderAdminBonsPlansList();
        } else if (finalKey === "media") {
          renderAdminMediaList();
        } else if (finalKey === "bugs") {
          renderAdminBugsList();
        } else if (finalKey === "contact") {
          renderAdminContactRequestsList();
        } else if (finalKey === "conditions") {
          // Charger le texte des conditions dans le formulaire
          const conditionsText = getConditionsText();
          const conditionsTextarea = document.getElementById("conditions-text");
          if (conditionsTextarea) {
            conditionsTextarea.value = conditionsText;
          }
        } else if (finalKey === "users") {
          renderAdminUsersLogsList();
        }
      } catch (e) {
        console.error(`Erreur lors du rendu de l'onglet ${finalKey}:`, e);
      }
    }

    // Sauvegarder l'état dans localStorage
    localStorage.setItem("admin-active-tab", finalKey);

    // Mettre à jour l'URL hash (sans recharger)
    if (window.history.replaceState) {
      window.history.replaceState(null, null, `#${finalKey}`);
    }
  }

  // Event delegation : un seul listener sur le conteneur des tabs
  const adminTabsContainer = document.querySelector(".admin-tabs");
  if (adminTabsContainer) {
    adminTabsContainer.addEventListener("click", (e) => {
      const clickedTab = e.target.closest("[data-admin-tab]");
      if (!clickedTab) return;

      e.preventDefault();
      const tabKey = clickedTab.dataset.adminTab;
      if (tabKey) {
        setAdminTab(tabKey);

        // Logique spécifique par onglet
        if (tabKey === "promo") {
          initAdminPromoPage();
        } else if (tabKey === "partnership") {
          renderAdminSponsorsList();
        } else if (tabKey === "team") {
          renderAdminTeamList();
          // Pré-remplir le formulaire texte global
          const teamData = getTeamData();
          const aboutTitleInput = document.getElementById("team-about-title");
          const aboutTextInput = document.getElementById("team-about-text");
          if (aboutTitleInput)
            aboutTitleInput.value = teamData.aboutTitle || "Équipe";
          if (aboutTextInput)
            aboutTextInput.value =
              teamData.aboutText || "Les admins et rédacteurs du site";
        }
      }
    });
  }

  // ADDED: Initialisation Articles
  const btnAddArticle = document.getElementById("btn-add-article");
  const btnCancelArticle = document.getElementById("btn-cancel-article-modal");
  const btnCloseArticle = document.getElementById("articleModalCloseBtn");
  const overlayArticle = document.getElementById("articleModalOverlay");
  const articleForm = document.getElementById("articleForm");

  // ADDED: Remplir le SELECT auteur avec les auteurs (nouvelle source unique)
  const authorIdSelect = document.getElementById("article-authorId");
  if (authorIdSelect) {
    // ADDED: Utiliser getTeamData() comme source de vérité pour les auteurs
    const teamData = getTeamData();
    const teamMembers =
      teamData && Array.isArray(teamData.members) ? teamData.members : [];
    // Filtrer uniquement les membres actifs
    const activeMembers = teamMembers.filter((m) => {
      const normalized = normalizeTeamMember(m);
      return normalized && normalized.isActive !== false;
    });

    // ADDED: Si aucun membre actif, fallback sur getAuthors() (compatibilité)
    const authors =
      activeMembers.length > 0
        ? activeMembers.map((m) => {
            const normalized = normalizeTeamMember(m);
            return {
              id: normalized.id,
              name: normalized.name,
              role: normalized.role,
            };
          })
        : getAuthors();
    // Garder l'option par défaut
    const defaultOption = authorIdSelect.querySelector('option[value=""]');
    authorIdSelect.innerHTML = "";
    if (defaultOption) {
      authorIdSelect.appendChild(defaultOption);
    } else {
      authorIdSelect.innerHTML =
        '<option value="">-- Sélectionner un auteur --</option>';
    }
    // Ajouter les auteurs
    authors.forEach((author) => {
      const option = document.createElement("option");
      option.value = author.id;
      option.textContent = author.name;
      authorIdSelect.appendChild(option);
    });

    // ADDED: Mettre à jour authorName quand authorId change
    authorIdSelect.addEventListener("change", function () {
      const authorNameField = document.getElementById("article-authorName");
      if (authorNameField) {
        if (this.value) {
          const selectedAuthor = authors.find((a) => a.id === this.value);
          if (selectedAuthor) {
            authorNameField.value = selectedAuthor.name;
          } else {
            authorNameField.value = "";
          }
        } else {
          authorNameField.value = "";
        }
      }
    });
  }

  if (btnAddArticle) {
    btnAddArticle.addEventListener("click", () => openArticleModal("create"));
  }

  if (btnCancelArticle) {
    btnCancelArticle.addEventListener("click", closeArticleModal);
  }

  if (btnCloseArticle) {
    btnCloseArticle.addEventListener("click", closeArticleModal);
  }

  if (overlayArticle) {
    overlayArticle.addEventListener("click", closeArticleModal);
  }

  if (articleForm) {
    articleForm.addEventListener("submit", handleArticleFormSubmit);

    // ADDED: Gérer l'affichage/masquage des champs link selon le type
    const ctaTypeSelect = document.getElementById("article-cta-type");
    const ctaUrlInput = document.getElementById("article-cta-url");
    const linkTitleInput = document.getElementById("article-link-title");
    const linkTextInput = document.getElementById("article-link-text");
    const linkButtonInput = document.getElementById("article-link-button");
    const linkDiscountInput = document.getElementById("article-link-discount");
    const linkButtonHelper = document.getElementById(
      "article-link-button-helper",
    );

    if (
      ctaTypeSelect &&
      ctaUrlInput &&
      linkTitleInput &&
      linkTextInput &&
      linkButtonInput &&
      linkDiscountInput
    ) {
      function toggleCtaFields() {
        const type = ctaTypeSelect.value;
        if (type === "none") {
          ctaUrlInput.style.display = "none";
          linkTitleInput.style.display = "none";
          linkTextInput.style.display = "none";
          linkButtonInput.style.display = "none";
          linkDiscountInput.style.display = "none";
          if (linkButtonHelper) linkButtonHelper.style.display = "none";
          ctaUrlInput.removeAttribute("required");
          // Vider visuellement mais ne pas supprimer
          ctaUrlInput.value = "";
          linkTitleInput.value = "";
          linkTextInput.value = "";
          linkButtonInput.value = "";
          linkDiscountInput.value = "";
        } else {
          ctaUrlInput.style.display = "block";
          linkTitleInput.style.display = "block";
          linkTextInput.style.display = "block";
          linkButtonInput.style.display = "block";
          linkDiscountInput.style.display = "block";
          if (linkButtonHelper) linkButtonHelper.style.display = "block";
          ctaUrlInput.setAttribute("required", "required");
          // Mettre à jour le placeholder selon le type
          if (type === "youtube") {
            ctaUrlInput.placeholder =
              "https://youtube.com/... ou https://youtu.be/...";
          } else {
            ctaUrlInput.placeholder = "https://...";
          }
        }
      }

      ctaTypeSelect.addEventListener("change", toggleCtaFields);
      // Initialiser au chargement
      toggleCtaFields();
    }

    // ADDED: Effacer erreurs à la saisie (UX améliorée)
    const formInputs = articleForm.querySelectorAll("input, textarea, select");
    formInputs.forEach((input) => {
      input.addEventListener("input", function () {
        const fieldName = this.name || this.id.replace("article-", "");
        if (fieldName) {
          const errorEl = document.getElementById(`error-${this.id}`);
          if (errorEl) errorEl.textContent = "";
          this.classList.remove("invalid", "is-invalid");
        }

        // ADDED: Mettre à jour le preview de l'image cover en temps réel
        if (this.id === "article-cover") {
          updateArticleCoverPreview(this.value);
        }
      });
    });
  }

  // ADDED: Event delegation robuste pour le bouton Enregistrer (au cas où le listener submit ne fonctionne pas)
  document.addEventListener("click", function (e) {
    const btn = e.target.closest("#articleSaveBtn");
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    console.log("[admin] click save article (via delegation)");
    window.__debugLastAction = "saveArticleClicked";

    // Déclencher le submit du formulaire pour utiliser la logique existante
    const form = document.getElementById("articleForm");
    if (form) {
      // Créer un événement submit synthétique
      const submitEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      form.dispatchEvent(submitEvent);
    }
  });

  // ADDED: Fermer modal article avec Esc
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const articleModal = document.getElementById("articleModal");
      if (articleModal && articleModal.classList.contains("is-open")) {
        closeArticleModal();
      }
    }
  });

  // ADDED: Délégation d'événements pour les boutons "Modifier" et "Supprimer" articles
  const articlesList = document.getElementById("adminArticlesList");
  if (articlesList) {
    articlesList.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".btn-edit-article");
      const deleteBtn = e.target.closest(".btn-delete-article");

      if (editBtn) {
        e.preventDefault();
        e.stopPropagation();
        const articleId = editBtn.dataset.articleId;
        if (articleId) {
          editArticle(articleId);
        }
      }

      if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();
        const articleId = deleteBtn.dataset.articleId;
        if (articleId) {
          deleteArticle(articleId);
        }
      }
    });
  }

  // ADDED: Event delegation pour les boutons d'ajout de blocs d'articles
  console.log("initAdminPage: Installation event listener pour blocs articles"); // DEBUG
  document.addEventListener("click", function (e) {
    // Bouton + Texte
    const btnText = e.target.closest("#btn-add-block-text");
    if (btnText) {
      console.log("ADD_BLOCK_CLICK", "btn-add-block-text"); // DEBUG
      e.preventDefault();
      e.stopPropagation();
      const blocksList = document.getElementById("article-blocks-list");
      if (blocksList) {
        addArticleBlock("text");
      }
      return;
    }

    // Bouton + Titre
    const btnHeading = e.target.closest("#btn-add-block-heading");
    if (btnHeading) {
      console.log("ADD_BLOCK_CLICK", "btn-add-block-heading"); // DEBUG
      e.preventDefault();
      e.stopPropagation();
      const blocksList = document.getElementById("article-blocks-list");
      if (blocksList) {
        addArticleBlock("heading");
      }
      return;
    }

    // Bouton + Image
    const btnImage = e.target.closest("#btn-add-block-image");
    if (btnImage) {
      console.log("ADD_BLOCK_CLICK", "btn-add-block-image"); // DEBUG
      e.preventDefault();
      e.stopPropagation();
      const blocksList = document.getElementById("article-blocks-list");
      if (blocksList) {
        addArticleBlock("image");
      }
      return;
    }

    // ADDED: Bouton "+ Offre"
    const btnOffer = e.target.closest("#btn-add-block-offer");
    if (btnOffer) {
      console.log("ADD_BLOCK_CLICK", "btn-add-block-offer"); // DEBUG
      e.preventDefault();
      e.stopPropagation();
      const blocksList = document.getElementById("article-blocks-list");
      if (blocksList) {
        addArticleBlock("offer");
      }
      return;
    }

    // ADDED: Bouton "+ YouTube"
    const btnYouTube = e.target.closest("#btn-add-block-youtube");
    if (btnYouTube) {
      e.preventDefault();
      e.stopPropagation();
      const blocksList = document.getElementById("article-blocks-list");
      if (blocksList) {
        addArticleBlock("youtube");
      }
      return;
    }

    // ADDED: Bouton "+ X" (anciennement Twitter)
    const btnTwitter = e.target.closest("#btn-add-block-twitter");
    if (btnTwitter) {
      e.preventDefault();
      e.stopPropagation();
      const blocksList = document.getElementById("article-blocks-list");
      if (blocksList) {
        addArticleBlock("twitter");
      }
      return;
    }
  });

  // ADDED: Event delegation pour les actions sur les blocs (Supprimer, Monter, Descendre)
  const blocksListContainer = document.getElementById("article-blocks-list");
  if (blocksListContainer) {
    blocksListContainer.addEventListener("click", function (e) {
      // Bouton supprimer
      const removeBtn = e.target.closest("[data-block-remove]");
      if (removeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(removeBtn.dataset.blockRemove);
        if (!isNaN(index)) {
          removeArticleBlock(index);
        }
        return;
      }

      // Bouton déplacer
      const moveBtn = e.target.closest("[data-block-move]");
      if (moveBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(moveBtn.dataset.blockIndex);
        const direction = moveBtn.dataset.blockMove;
        if (!isNaN(index)) {
          moveArticleBlock(index, direction);
        }
        return;
      }

      // Bouton choisir média
      const pickMediaBtn = e.target.closest("[data-block-pick-media]");
      if (pickMediaBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(pickMediaBtn.dataset.blockPickMedia);
        if (!isNaN(index)) {
          // ADDED: Mémoriser la référence directe de l'input pour injection fiable
          const blocksList = document.getElementById("article-blocks-list");
          if (blocksList) {
            const blockEl = blocksList.querySelector(
              `[data-block-index="${index}"]`,
            );
            if (blockEl) {
              const urlInput = blockEl.querySelector(
                'input[data-block-field="url"]',
              );
              if (urlInput) {
                // Mémoriser la référence de l'input ciblé
                window.__mediaTargetInput = urlInput;
                currentBlockImageIndex = index;
                openMediaPicker("article-block");
              }
            }
          }
        }
        return;
      }

      // ADDED: Bouton "Choisir dans Médias" pour les blocs offre
      const pickMediaOfferBtn = e.target.closest(
        "[data-block-pick-media-offer]",
      );
      if (pickMediaOfferBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(pickMediaOfferBtn.dataset.blockPickMediaOffer);
        if (!isNaN(index)) {
          // PATCH A: Mémoriser la cible "imageUrl" du bloc courant
          window.__mediaPickerTarget = null;
          const blockEl =
            pickMediaOfferBtn.closest(".article-block-item") ||
            pickMediaOfferBtn.closest("[data-block-id]") ||
            pickMediaOfferBtn.closest(".block");
          if (blockEl) {
            // input URL image (le champ "URL de l'image" dans le bloc Offre)
            const target =
              blockEl.querySelector('input[data-field="imageUrl"]') ||
              blockEl.querySelector('input[placeholder*="URL de l\'image"]') ||
              blockEl.querySelector('input[name*="image"]') ||
              blockEl.querySelector('input[id*="image"]');

            // CHECKPOINT A: Log blockEl, targetInput, value AVANT sélection
            const valueBefore = target?.value || "";

            window.__mediaPickerTarget = { blockEl, target };
            openMediaPicker("article-block");
          } else {
            // CHECKPOINT A: Log si blockEl non trouvé
          }
        }
        return;
      }
    });

    // ADDED: Mise à jour du preview image en temps réel
    blocksListContainer.addEventListener("input", function (e) {
      const urlInput = e.target.closest('input[data-block-field="url"]');
      if (urlInput) {
        const blockEl = urlInput.closest(".article-block-item");
        if (blockEl) {
          const index = parseInt(blockEl.dataset.blockIndex);
          let url = urlInput.value;

          // ADDED: Vérifier la taille des dataURLs et avertir si trop lourd
          if (url && url.startsWith("data:image/")) {
            const sizeBytes = estimateDataUrlSize(url);
            const sizeMB = sizeBytes / (1024 * 1024);
            const thresholdMB = 1.2;

            if (sizeBytes > thresholdMB * 1024 * 1024) {
              const message = `Image trop lourde en base64 (${sizeMB.toFixed(2)} MB). Préfère une URL ou compresse l'image.`;
              alert(message);
              // Empêcher l'injection en vidant le champ
              urlInput.value = "";
              url = "";
            }
          }

          const previewEl = blocksListContainer.querySelector(
            `[data-block-preview="${index}"]`,
          );
          if (previewEl) {
            // ADDED: Utiliser isImageSrcPreviewable() pour accepter http/https ET data:image/ ET blob:
            if (isImageSrcPreviewable(url)) {
              // ADDED: Récupérer l'alt depuis le champ alt si disponible
              const altInput = blockEl.querySelector(
                'input[data-block-field="alt"]',
              );
              const alt = altInput ? escapeHtml(altInput.value || "") : "";
              previewEl.innerHTML = `<img src="${escapeHtml(url)}" alt="${alt || "Preview"}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.parentElement.innerHTML='<div style=\\'color: var(--color-text-secondary); font-size: 0.75em;\\'>Erreur de chargement</div>'">`;
            } else {
              previewEl.innerHTML =
                '<div style="color: var(--color-text-secondary); font-size: 0.75em;">Aperçu indisponible</div>';
            }
          }
        }
      }

      // ADDED: Mise à jour du preview pour les blocs offer (imageUrl) - utiliser data-field="imageUrl"
      const imageUrlInput = e.target.closest('input[data-field="imageUrl"]');
      if (imageUrlInput) {
        const blockEl = imageUrlInput.closest(".article-block-item");
        if (blockEl && blockEl.dataset.blockType === "offer") {
          const index = parseInt(blockEl.dataset.blockIndex);
          let imageUrl = imageUrlInput.value;

          // ADDED: Vérifier la taille des dataURLs et avertir si trop lourd
          if (imageUrl && imageUrl.startsWith("data:image/")) {
            const sizeBytes = estimateDataUrlSize(imageUrl);
            const sizeMB = sizeBytes / (1024 * 1024);
            const thresholdMB = 1.2;

            if (sizeBytes > thresholdMB * 1024 * 1024) {
              const message = `Image trop lourde en base64 (${sizeMB.toFixed(2)} MB). Préfère une URL ou compresse l'image.`;
              alert(message);
              imageUrlInput.value = "";
              imageUrl = "";
            }
          }

          const previewEl = blocksListContainer.querySelector(
            `[data-block-preview="${index}"]`,
          );
          if (previewEl) {
            if (isImageSrcPreviewable(imageUrl)) {
              const titleInput = blockEl.querySelector(
                'input[data-field="title"]',
              );
              const title = titleInput
                ? escapeHtml(titleInput.value || "")
                : "";
              previewEl.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="${title || "Preview"}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.parentElement.innerHTML='<div style=\\'color: var(--color-text-secondary); font-size: 0.75em;\\'>Erreur de chargement</div>'">`;
            } else {
              previewEl.innerHTML =
                '<div style="color: var(--color-text-secondary); font-size: 0.75em;">Aperçu indisponible</div>';
            }
          }
        }
      }

      // ADDED: Mise à jour du preview YouTube en temps réel
      const youtubeUrlInput = e.target.closest('input[data-field="url"]');
      if (youtubeUrlInput) {
        const blockEl = youtubeUrlInput.closest(".article-block-item");
        if (blockEl && blockEl.dataset.blockType === "youtube") {
          const index = parseInt(blockEl.dataset.blockIndex);
          const url = youtubeUrlInput.value || "";

          const videoId = extractYouTubeId(url);
          const thumbUrl = getYouTubeThumb(videoId);
          const embedSrc = getYouTubeEmbedSrc(videoId);
          const isFileProtocol = window.location.protocol === "file:";

          // DEBUG: Log pour vérifier le src réel
          console.log(
            "[YT DEBUG PREVIEW] rawUrl=",
            url,
            "id=",
            videoId,
            "embedSrc=",
            embedSrc,
            "isFileProtocol=",
            isFileProtocol,
          );

          const previewEl = blocksListContainer.querySelector(
            `[data-block-preview="${index}"]`,
          );
          if (previewEl) {
            if (videoId) {
              if (isFileProtocol || !embedSrc) {
                // En file:// ou si pas d'embedSrc, afficher directement le fallback
                previewEl.innerHTML = `<div class="yt-fallback yt-preview" style="background-image: url('${escapeHtml(thumbUrl)}');" onclick="window.open('${escapeHtml(url)}', '_blank', 'noopener')">
                                    <div class="yt-play-icon"></div>
                                    <div class="yt-badge">YouTube</div>
                                </div>`;
              } else {
                // En http/https, afficher iframe + fallback en overlay
                previewEl.innerHTML = `<iframe src="${escapeHtml(embedSrc)}" title="YouTube video" frameborder="0" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width: 100%; height: 100%; z-index: 1; position: absolute; top: 0; left: 0;" data-yt-video-id="${escapeHtml(videoId)}" data-yt-original-url="${escapeHtml(url)}"></iframe>
                                <div class="yt-fallback yt-preview" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none; z-index: 2; background-image: url('${escapeHtml(thumbUrl)}');" onclick="window.open('${escapeHtml(url)}', '_blank', 'noopener')">
                                    <div class="yt-play-icon"></div>
                                    <div class="yt-badge">YouTube</div>
                                </div>`;

                // Détection d'erreur embed
                setTimeout(() => {
                  const ifr = previewEl.querySelector('iframe[src*="youtube"]');
                  const fallback = previewEl.querySelector(".yt-fallback");
                  if (ifr && fallback) {
                    let loaded = false;
                    ifr.addEventListener("load", () => {
                      loaded = true;
                      setTimeout(() => {
                        const rect = ifr.getBoundingClientRect();
                        if (rect.height < 50 || rect.width < 50) {
                          ifr.style.display = "none";
                          fallback.style.display = "flex";
                        }
                      }, 500);
                    });

                    setTimeout(() => {
                      if (!loaded) {
                        ifr.style.display = "none";
                        fallback.style.display = "flex";
                      }
                    }, 2500);
                  }
                }, 0);
              }
            } else {
              previewEl.innerHTML =
                '<div style="color: var(--color-text-secondary); font-size: 0.75em; text-align: center; padding: var(--spacing-md);">URL YouTube invalide</div>';
            }
          }
        }
      }

      // ADDED: Mise à jour du preview X/Twitter en temps réel
      const twitterUrlInput = e.target.closest('input[data-field="url"]');
      if (twitterUrlInput) {
        const blockEl = twitterUrlInput.closest(".article-block-item");
        if (blockEl && blockEl.dataset.blockType === "twitter") {
          const index = parseInt(blockEl.dataset.blockIndex);
          const url = twitterUrlInput.value || "";

          const previewEl = blocksListContainer.querySelector(
            `[data-block-preview="${index}"]`,
          );
          if (previewEl) {
            if (url) {
              const tweetUrl = url.trim();
              previewEl.innerHTML = `<blockquote class="twitter-tweet"><a href="${escapeHtml(tweetUrl)}"></a></blockquote>`;

              // Charger Twitter widgets de façon fiable
              function ensureTwitterWidgets(cb) {
                if (window.twttr && window.twttr.widgets) return cb();
                if (document.querySelector("script[data-twitter-widgets]")) {
                  const t = setInterval(() => {
                    if (window.twttr && window.twttr.widgets) {
                      clearInterval(t);
                      cb();
                    }
                  }, 50);
                  return;
                }
                const s = document.createElement("script");
                s.src = "https://platform.twitter.com/widgets.js";
                s.async = true;
                s.defer = true;
                s.setAttribute("data-twitter-widgets", "1");
                s.onload = cb;
                document.head.appendChild(s);
              }

              ensureTwitterWidgets(() => {
                if (window.twttr && window.twttr.widgets) {
                  window.twttr.widgets.load(previewEl);
                }
              });
            } else {
              previewEl.innerHTML =
                '<div style="color: var(--color-text-secondary); font-size: 0.75em; text-align: center; padding: var(--spacing-md);">Aperçu indisponible</div>';
            }
          }
        }
      }
    });

    // REMOVED: Event listener display supprimé (fonctionnalité retirée)
  }

  // ADDED: Event delegation pour les actions sur les blocs de test
  const testBlocksListContainer = document.getElementById("test-blocks-list");
  if (testBlocksListContainer) {
    testBlocksListContainer.addEventListener("click", function (e) {
      // Bouton supprimer
      const removeBtn = e.target.closest("[data-block-remove]");
      if (removeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(removeBtn.dataset.blockRemove);
        if (!isNaN(index)) {
          removeTestBlock(index);
        }
        return;
      }

      // Bouton déplacer
      const moveBtn = e.target.closest("[data-block-move]");
      if (moveBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(moveBtn.dataset.blockIndex);
        const direction = moveBtn.dataset.blockMove;
        if (!isNaN(index)) {
          moveTestBlock(index, direction);
        }
        return;
      }

      // Bouton choisir média
      const pickMediaBtn = e.target.closest("[data-block-choose-media]");
      if (pickMediaBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(pickMediaBtn.dataset.blockIndex);
        if (!isNaN(index)) {
          // Mémoriser la référence directe de l'input pour injection fiable
          const blockEl = testBlocksListContainer.querySelector(
            `[data-block-index="${index}"]`,
          );
          if (blockEl) {
            const urlInput = blockEl.querySelector(
              'input[data-block-field="url"]',
            );
            if (urlInput) {
              // Mémoriser la référence de l'input ciblé
              window.__mediaTargetInput = urlInput;
              openMediaPicker("test-block");
            }
          }
        }
        return;
      }
    });

    // ADDED: Mise à jour du preview image en temps réel pour les blocs de test
    testBlocksListContainer.addEventListener("input", function (e) {
      const urlInput = e.target.closest('input[data-block-field="url"]');
      if (urlInput) {
        const blockEl = urlInput.closest(".test-block-item");
        if (blockEl) {
          const index = parseInt(blockEl.dataset.blockIndex);
          let url = urlInput.value;

          // Vérifier la taille des dataURLs et avertir si trop lourd
          if (url && url.startsWith("data:image/")) {
            const sizeBytes = estimateDataUrlSize(url);
            const sizeMB = sizeBytes / (1024 * 1024);
            const thresholdMB = 1.2;

            if (sizeBytes > thresholdMB * 1024 * 1024) {
              const message = `Image trop lourde en base64 (${sizeMB.toFixed(2)} MB). Préfère une URL ou compresse l'image.`;
              alert(message);
              urlInput.value = "";
              url = "";
            }
          }
        }
      }
    });
  }

  // ADDED: Bouton réinitialiser articles
  const btnResetArticles = document.getElementById("btn-reset-articles");
  if (btnResetArticles) {
    btnResetArticles.addEventListener("click", () => {
      if (confirm("Réinitialiser les articles vers data.js ?")) {
        localStorage.removeItem(window.LMD.storageKeys.articles);
        renderAdminArticlesList();
      }
    });
  }

  // ADDED: Initialiser la liste des articles
  renderAdminArticlesList();

  // ADDED: Initialisation Tests
  const btnAddTest = document.getElementById("btn-add-test");
  const btnResetTests = document.getElementById("btn-reset-tests");

  if (btnAddTest) {
    btnAddTest.addEventListener("click", () => {
      openTestModal();
    });
  }

  if (btnResetTests) {
    btnResetTests.addEventListener("click", () => {
      if (confirm("Réinitialiser les tests vers data.js ?")) {
        localStorage.removeItem(window.LMD.storageKeys.tests);
        renderAdminTestsList();
      }
    });
  }

  // ADDED: Initialiser la liste des tests
  renderAdminTestsList();

  // ADDED: Initialisation Bons plans
  const btnAddBonPlan = document.getElementById("btn-add-bon-plan");
  const btnResetBonsPlans = document.getElementById("btn-reset-bons-plans");

  if (btnAddBonPlan) {
    btnAddBonPlan.addEventListener("click", () => {
      openBonPlanModal();
    });
  }

  if (btnResetBonsPlans) {
    btnResetBonsPlans.addEventListener("click", () => {
      if (confirm("Réinitialiser les bons plans vers data.js ?")) {
        localStorage.removeItem(window.LMD.storageKeys.bonsplans);
        renderAdminBonsPlansList();
      }
    });
  }

  // ADDED: Initialiser la liste des bons plans
  renderAdminBonsPlansList();

  // ADDED: Initialisation Bugs
  const btnAddBug = document.getElementById("btn-add-bug");

  if (btnAddBug) {
    btnAddBug.addEventListener("click", () => {
      openBugModal();
    });
  }

  // ADDED: Gestionnaire d'événements pour les actions sur les bugs
  const adminBugsList = document.getElementById("adminBugsList");
  if (adminBugsList) {
    adminBugsList.addEventListener("click", (e) => {
      const bugId = e.target.dataset.bugId;
      if (!bugId) return;

      if (e.target.classList.contains("btn-clear-bug")) {
        e.preventDefault();
        if (confirm("Marquer ce bug comme corrigé ?")) {
          toggleBugStatus(bugId);
          renderAdminBugsList();
        }
      } else if (e.target.classList.contains("btn-reopen-bug")) {
        e.preventDefault();
        if (confirm("Rouvrir ce bug ?")) {
          toggleBugStatus(bugId);
          renderAdminBugsList();
        }
      } else if (e.target.classList.contains("btn-delete-bug")) {
        e.preventDefault();
        if (confirm("Supprimer définitivement ce bug ?")) {
          deleteBug(bugId);
          renderAdminBugsList();
        }
      }
    });
  }

  // ADDED: Gestionnaire d'événements pour les actions sur les demandes de contact
  const adminContactRequestsList = document.getElementById(
    "adminContactRequestsList",
  );
  if (adminContactRequestsList) {
    adminContactRequestsList.addEventListener("click", (e) => {
      const requestId = e.target.dataset.requestId;
      if (!requestId) return;

      if (e.target.classList.contains("btn-mark-read")) {
        e.preventDefault();
        if (confirm("Marquer cette demande comme lue ?")) {
          updateContactRequest(requestId, { status: "read" });
          renderAdminContactRequestsList();
        }
      } else if (e.target.classList.contains("btn-close-request")) {
        e.preventDefault();
        if (confirm("Fermer cette demande de contact ?")) {
          updateContactRequest(requestId, { status: "closed" });
          renderAdminContactRequestsList();
        }
      } else if (e.target.classList.contains("btn-reopen-request")) {
        e.preventDefault();
        if (confirm("Rouvrir cette demande de contact ?")) {
          updateContactRequest(requestId, { status: "read" });
          renderAdminContactRequestsList();
        }
      } else if (e.target.classList.contains("btn-delete-request")) {
        e.preventDefault();
        if (confirm("Supprimer définitivement cette demande ?")) {
          deleteContactRequest(requestId);
          renderAdminContactRequestsList();
        }
      }
    });
  }

  // ADDED: Gestionnaire pour le formulaire des conditions
  const conditionsForm = document.getElementById("conditionsForm");
  if (conditionsForm) {
    conditionsForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const formData = new FormData(conditionsForm);
      const conditionsText = formData.get("conditionsText")?.trim() || "";

      if (saveConditionsText(conditionsText)) {
        const feedback = document.getElementById("conditions-feedback");
        if (feedback) {
          feedback.textContent = "Conditions sauvegardées avec succès !";
          feedback.style.display = "block";
          setTimeout(() => {
            feedback.style.display = "none";
          }, 3000);
        }
      } else {
        alert("Erreur lors de la sauvegarde des conditions.");
      }
    });
  }

  // ADDED: Boutons injection démo
  const btnInjectDemo = document.getElementById("btn-inject-demo");
  const btnResetDemo = document.getElementById("btn-reset-demo");

  if (btnInjectDemo) {
    btnInjectDemo.addEventListener("click", () => {
      if (
        confirm(
          "Cette action va injecter du contenu démo réaliste dans localStorage.\n\nToutes les pages seront remplies après refresh.\n\nContinuer ?",
        )
      ) {
        debugLog("DEMO", "Injecting demo content...");
        applyDemoInjection();

        // Refresh des listes admin après injection
        setTimeout(() => {
          renderAdminGamesList();
          renderAdminArticlesList();
          renderAdminTestsList();
          renderAdminBonsPlansList();
          updateAdminSiteCounters();
          alert(
            "Contenu démo injecté ! Rafraîchissez les pages publiques pour voir le résultat.",
          );
        }, 500);
      }
    });
  }

  if (btnResetDemo) {
    btnResetDemo.addEventListener("click", () => {
      if (
        confirm(
          "Cette action va supprimer UNIQUEMENT le contenu démo injecté.\nLe contenu réel créé manuellement sera conservé.\n\nContinuer ?",
        )
      ) {
        debugLog("DEMO", "Resetting demo content...");
        resetDemoContent();

        // Refresh des listes admin après reset
        setTimeout(() => {
          renderAdminGamesList();
          renderAdminArticlesList();
          renderAdminTestsList();
          renderAdminBonsPlansList();
          updateAdminSiteCounters();
          alert("Contenu démo supprimé !");
        }, 500);
      }
    });
  }

  // ADDED: Boutons export/import données
  const btnExportData = document.getElementById("btn-export-data");
  const btnImportData = document.getElementById("btn-import-data");
  const importFileInput = document.getElementById("import-file");

  if (btnExportData) {
    btnExportData.addEventListener("click", () => {
      if (confirm("Exporter toutes vos données admin dans un fichier JSON ?\n\nCe fichier contiendra tous les jeux, articles, tests, etc. que vous avez créés.")) {
        exportAdminData();
      }
    });
  }

  if (btnImportData && importFileInput) {
    btnImportData.addEventListener("click", () => {
      importFileInput.click();
    });

    importFileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!confirm(`Importer les données depuis "${file.name}" ?\n\n⚠️ Attention: Cela remplacera vos données actuelles !`)) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        importAdminData(e.target.result);
      };
      reader.readAsText(file);
    });
  }

  // ADDED: Initialisation modal Bug
  const bugModal = document.getElementById("bugModal");
  const btnCancelBug = document.getElementById("bug-cancel");
  const btnCloseBug = document.getElementById("bugModalCloseBtn");
  const overlayBug = document.getElementById("bugModalOverlay");
  const bugForm = document.getElementById("bugForm");

  // Gestionnaire pour fermer le modal
  const closeBugModalHandler = () => closeBugModal();
  if (btnCancelBug)
    btnCancelBug.addEventListener("click", closeBugModalHandler);
  if (btnCloseBug) btnCloseBug.addEventListener("click", closeBugModalHandler);
  if (overlayBug) overlayBug.addEventListener("click", closeBugModalHandler);

  // Soumission du formulaire bug
  if (bugForm) {
    bugForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const formData = new FormData(bugForm);
      const bugData = {
        title: formData.get("title")?.trim(),
        desc: formData.get("desc")?.trim(),
        severity: formData.get("severity") || "medium",
        page: formData.get("page")?.trim() || "",
        reporter: formData.get("reporter")?.trim() || "",
      };

      // Validation
      if (!bugData.title || !bugData.desc) {
        alert("Titre et description sont obligatoires.");
        return;
      }

      const bugId = formData.get("id");
      let success = false;

      if (bugId) {
        // Mode édition
        success = updateBug(bugId, bugData);
      } else {
        // Mode création
        const newBug = addBug(bugData);
        success = !!newBug;
      }

      if (success) {
        closeBugModal();
        renderAdminBugsList();
      } else {
        alert("Erreur lors de la sauvegarde du bug.");
      }
    });
  }

  // Fermer modal avec Échap
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      bugModal &&
      bugModal.classList.contains("is-open")
    ) {
      closeBugModal();
    }
  });

  // Initialisation du statut du site
  updateSiteStatus();

  // FIX: Activer explicitement l'onglet actif au premier load
  // Après avoir bind les event listeners, déclencher l'onglet par défaut
  setTimeout(() => {
    try {
      // Déterminer l'onglet actif depuis URL hash ou défaut "games"
      const hash = window.location.hash.replace("#", "") || "games";
      const validTabs = [
        "games",
        "articles",
        "tests",
        "bons-plans",
        "media",
        "bugs",
        "contact",
        "conditions",
        "users",
      ];

      if (validTabs.includes(hash)) {
        setAdminTab(hash);
      } else {
        setAdminTab("games"); // Défaut
      }
    } catch (e) {
      console.error("Erreur lors de l'activation de l'onglet par défaut:", e);
      // Fallback: essayer d'activer games
      try {
        setAdminTab("games");
      } catch (fallbackError) {
        console.error("Erreur fallback activation games:", fallbackError);
      }
    }
  }, 100); // Petit délai pour s'assurer que le DOM est prêt

  // ADDED: Initialiser les compteurs du site de manière safe (après l'activation des onglets)
  setTimeout(() => {
    try {
      updateAdminSiteCounters();
    } catch (e) {
      console.warn("Erreur lors de l'initialisation des compteurs admin:", e);
      // Ne pas bloquer le reste de l'admin si les compteurs plantent
    }
  }, 200);

  // ADDED: Gestion du modal Test
  const btnCancelTest = document.getElementById("test-cancel");
  const btnCloseTest = document.getElementById("testModalCloseBtn");
  const overlayTest = document.getElementById("testModalOverlay");
  const testForm = document.getElementById("testForm");
  const btnChooseMediaTest = document.getElementById("btn-choose-media-test");
  const btnAddCriterion = document.getElementById("btn-add-criterion");

  if (btnCancelTest) btnCancelTest.addEventListener("click", closeTestModal);
  if (btnCloseTest) btnCloseTest.addEventListener("click", closeTestModal);
  if (overlayTest) overlayTest.addEventListener("click", closeTestModal);

  if (btnChooseMediaTest) {
    btnChooseMediaTest.addEventListener("click", () => {
      openMediaPicker("test");
    });
  }

  // ADDED: Bouton "Choisir depuis Médias" pour bon plan
  const btnChooseMediaBonPlan = document.getElementById(
    "btn-choose-media-bon-plan",
  );
  if (btnChooseMediaBonPlan) {
    btnChooseMediaBonPlan.addEventListener("click", () => {
      openMediaPicker("bon-plan");
    });
  }

  if (btnAddCriterion) {
    btnAddCriterion.addEventListener("click", () => {
      // Récupérer les critères actuels depuis le formulaire
      const criteriaInputs = document.querySelectorAll(
        "#test-criteria-list .criterion-item",
      );
      const criteria = Array.from(criteriaInputs).map((item) => {
        const labelInput = item.querySelector('input[name*="[label]"]');
        const scoreInput = item.querySelector('input[name*="[score]"]');
        return {
          label: labelInput ? labelInput.value : "",
          score: scoreInput ? parseFloat(scoreInput.value) || 0 : 0,
        };
      });

      // Ajouter un nouveau critère vide
      criteria.push({ label: "", score: 0 });
      renderTestCriteria(criteria);
    });
  }

  if (testForm) {
    testForm.addEventListener("submit", handleTestFormSubmit);
  }

  // Gestionnaire pour les boutons Modifier/Supprimer dans la liste
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-edit-test")) {
      const testId = e.target.dataset.testId;
      const tests = getTestsData();
      const test = tests.find((t) => t.id === testId);
      if (test) {
        openTestModal("edit", test);
      }
    } else if (e.target.classList.contains("btn-delete-test")) {
      const testId = e.target.dataset.testId;
      const tests = getTestsData();
      const test = tests.find((t) => t.id === testId);
      if (test && confirm(`Supprimer le test "${test.title}" ?`)) {
        deleteTest(testId);
        renderAdminTestsList();
      }
    }
  });

  // Gestionnaire pour le champ cover
  const testCoverInput = document.getElementById("test-cover");
  if (testCoverInput) {
    testCoverInput.addEventListener("input", (e) => {
      updateTestCoverPreview(e.target.value);
    });
  }

  // ADDED: Gestion du modal Bon plan
  const bonPlanForm = document.getElementById("bonPlanForm");
  const btnCancelBonPlan = document.getElementById("bon-plan-cancel");
  const btnCloseBonPlan = document.getElementById("bonPlanModalCloseBtn");

  if (bonPlanForm) {
    bonPlanForm.addEventListener("submit", handleBonPlanFormSubmit);
  }

  if (btnCancelBonPlan) {
    btnCancelBonPlan.addEventListener("click", closeBonPlanModal);
  }

  if (btnCloseBonPlan) {
    btnCloseBonPlan.addEventListener("click", closeBonPlanModal);
  }

  // Gestionnaire pour le champ cover bon plan
  const bonPlanCoverInput = document.getElementById("bon-plan-cover");
  if (bonPlanCoverInput) {
    bonPlanCoverInput.addEventListener("input", (e) => {
      updateBonPlanCoverPreview(e.target.value);
    });
  }

  // Event delegation pour les blocs de bon plan
  const bonPlanBlocksListContainer = document.getElementById(
    "bon-plan-blocks-list",
  );
  if (bonPlanBlocksListContainer) {
    bonPlanBlocksListContainer.addEventListener("click", function (e) {
      // Bouton supprimer
      const removeBtn = e.target.closest("[data-block-remove]");
      if (removeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(removeBtn.dataset.blockRemove);
        if (!isNaN(index)) {
          removeBonPlanBlock(index);
        }
        return;
      }

      // Bouton déplacer
      const moveBtn = e.target.closest("[data-block-move]");
      if (moveBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(moveBtn.dataset.blockIndex);
        const direction = moveBtn.dataset.blockMove;
        if (!isNaN(index)) {
          moveBonPlanBlock(index, direction);
        }
        return;
      }

      // Bouton choisir média
      const pickMediaBtn = e.target.closest("[data-block-choose-media]");
      if (pickMediaBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(pickMediaBtn.dataset.blockIndex);
        if (!isNaN(index)) {
          // Mémoriser la référence directe de l'input pour injection fiable
          const blockEl = bonPlanBlocksListContainer.querySelector(
            `[data-block-index="${index}"]`,
          );
          if (blockEl) {
            const urlInput = blockEl.querySelector(
              'input[data-block-field="url"]',
            );
            if (urlInput) {
              // Mémoriser la référence de l'input ciblé
              window.__mediaTargetInput = urlInput;
              openMediaPicker("bon-plan-block");
            }
          }
        }
        return;
      }
    });

    // Mise à jour du preview image en temps réel pour les blocs de bon plan
    bonPlanBlocksListContainer.addEventListener("input", function (e) {
      const urlInput = e.target.closest('input[data-block-field="url"]');
      if (urlInput) {
        const blockEl = urlInput.closest(".bon-plan-block-item");
        if (blockEl) {
          const index = parseInt(blockEl.dataset.blockIndex);
          let url = urlInput.value;

          // Vérifier la taille des dataURLs et avertir si trop lourd
          if (url && url.startsWith("data:image/")) {
            const sizeBytes = estimateDataUrlSize(url);
            const sizeMB = sizeBytes / (1024 * 1024);
            const thresholdMB = 1.2;

            if (sizeBytes > thresholdMB * 1024 * 1024) {
              const message = `Image trop lourde en base64 (${sizeMB.toFixed(2)} MB). Préfère une URL ou compresse l'image.`;
              alert(message);
              urlInput.value = "";
              url = "";
            }
          }
        }
      }
    });
  }

  // Initialisation de l'onglet actif
  // Priorité : hash URL (#tests, #promo...) > localStorage > défaut 'games'
  const initActiveTab = () => {
    let activeTab = "games"; // Défaut

    // Vérifier le hash URL
    if (window.location.hash) {
      const hashTab = window.location.hash.substring(1); // Enlever le #
      const validTabs = [
        "games",
        "articles",
        "tests",
        "bons-plans",
        "media",
        "promo",
        "partnership",
        "team",
      ];
      if (validTabs.includes(hashTab)) {
        activeTab = hashTab;
      }
    }
    // Sinon utiliser localStorage
    else {
      const storedTab = localStorage.getItem("admin-active-tab");
      if (storedTab) {
        activeTab = storedTab;
      }
    }

    // Activer l'onglet déterminé
    setAdminTab(activeTab);
  };

  // Initialiser l'onglet actif au chargement
  initActiveTab();

  // ADDED: Formulaire texte global équipe
  const teamAboutForm = document.getElementById("teamAboutForm");
  if (teamAboutForm) {
    teamAboutForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const aboutTitleInput = document.getElementById("team-about-title");
      const aboutTextInput = document.getElementById("team-about-text");
      const feedbackEl = document.getElementById("team-about-feedback");

      if (!aboutTitleInput || !aboutTextInput) return;

      const aboutTitle = toText(aboutTitleInput.value).trim();
      const aboutText = toText(aboutTextInput.value).trim();

      if (!aboutTitle || !aboutText) {
        alert("Le titre et le texte sont obligatoires");
        return;
      }

      const teamData = getTeamData();
      const updatedTeamData = {
        aboutTitle: aboutTitle,
        aboutText: aboutText,
        members: teamData.members || [],
      };

      saveTeamData(updatedTeamData);

      if (feedbackEl) {
        feedbackEl.textContent = "Sauvegardé";
        feedbackEl.style.display = "block";
        setTimeout(() => {
          feedbackEl.style.display = "none";
        }, 2000);
      }
    });
  }

  // ADDED: Initialisation Médias
  const btnAddMedia = document.getElementById("btn-add-media");
  const btnCancelMedia = document.getElementById("btn-cancel-media-modal");
  const btnCloseMedia = document.getElementById("mediaModalCloseBtn");
  const overlayMedia = document.getElementById("mediaModalOverlay");
  const mediaForm = document.getElementById("mediaForm");

  if (btnAddMedia) {
    btnAddMedia.addEventListener("click", () => {
      openMediaModal();
      // ADDED: Pré-remplir le dossier si on est dans un dossier
      if (currentMediaFolder !== null) {
        const folderInput = document.getElementById("media-folder");
        if (folderInput) {
          folderInput.value = currentMediaFolder;
        }
      }
    });
  }

  if (btnCancelMedia) {
    btnCancelMedia.addEventListener("click", closeMediaModal);
  }

  if (btnCloseMedia) {
    btnCloseMedia.addEventListener("click", closeMediaModal);
  }

  if (overlayMedia) {
    overlayMedia.addEventListener("click", closeMediaModal);
  }

  if (mediaForm) {
    mediaForm.addEventListener("submit", handleMediaFormSubmit);

    // ADDED: Preview en temps réel
    const mediaUrlInput = document.getElementById("media-url");
    if (mediaUrlInput) {
      mediaUrlInput.addEventListener("input", function () {
        updateMediaPreview(this.value);
      });
    }
  }

  // ADDED: Boutons "Choisir depuis Médias"
  const btnChooseMediaGame = document.getElementById("btn-choose-media-game");
  const btnChooseMediaArticle = document.getElementById(
    "btn-choose-media-article",
  );

  if (btnChooseMediaGame) {
    btnChooseMediaGame.addEventListener("click", () => openMediaPicker("game"));
  }

  if (btnChooseMediaArticle) {
    btnChooseMediaArticle.addEventListener("click", () =>
      openMediaPicker("article"),
    );
  }

  // ADDED: Initialisation Équipe
  const teamMemberForm = document.getElementById("teamMemberForm");
  const teamMemberCancel = document.getElementById("team-member-cancel");
  const teamMemberClose = document.getElementById("teamMemberModalCloseBtn");
  const teamMemberOverlay = document.getElementById("teamMemberModalOverlay");
  const teamMemberPickPhoto = document.getElementById("team-member-pick-photo");
  const teamMemberAvatarInput = document.getElementById("team-member-avatar");
  const btnAddMember = document.getElementById("btn-add-member");

  if (teamMemberForm) {
    teamMemberForm.addEventListener("submit", handleTeamMemberFormSubmit);
  }

  // ADDED: Bouton "Ajouter un auteur"
  if (btnAddMember) {
    btnAddMember.addEventListener("click", function () {
      createTeamMember();
    });
  }

  // ADDED: Gestion changement type avatar
  const avatarTypeSelect = document.getElementById("team-member-avatar-type");
  if (avatarTypeSelect) {
    avatarTypeSelect.addEventListener("change", function () {
      toggleAvatarTypeFields(this.value);
    });
  }

  // ADDED: Preview avatar URL en temps réel
  const avatarUrlInput = document.getElementById("team-member-avatar-url");
  if (avatarUrlInput) {
    avatarUrlInput.addEventListener("input", function () {
      const avatarType = document.getElementById("team-member-avatar-type");
      if (avatarType && avatarType.value === "url") {
        updateTeamMemberPhotoPreview(this.value);
      }
    });
  }

  if (teamMemberCancel) {
    teamMemberCancel.addEventListener("click", closeTeamMemberModal);
  }

  if (teamMemberClose) {
    teamMemberClose.addEventListener("click", closeTeamMemberModal);
  }

  if (teamMemberOverlay) {
    teamMemberOverlay.addEventListener("click", closeTeamMemberModal);
  }

  // ADDED: Bouton "Choisir dans Médias" pour la photo
  if (teamMemberPickPhoto) {
    teamMemberPickPhoto.addEventListener("click", () => {
      // Ouvrir le media picker et stocker le contexte "team"
      openMediaPicker("team");
    });
  }

  // ADDED: Fermer modal picker média
  const btnCloseMediaPicker = document.getElementById(
    "mediaPickerModalCloseBtn",
  );
  const overlayMediaPicker = document.getElementById("mediaPickerModalOverlay");

  if (btnCloseMediaPicker) {
    btnCloseMediaPicker.addEventListener("click", closeMediaPickerModal);
  }

  if (overlayMediaPicker) {
    overlayMediaPicker.addEventListener("click", closeMediaPickerModal);
  }

  // ADDED: Event delegation globale pour les boutons média (une seule fois)
  document.addEventListener("click", handleMediaListClick);

  // ADDED: Fermer le menu au click outside
  document.addEventListener("click", function (e) {
    const mediaListGrid = document.getElementById("mediaListGrid");
    const foldersGrid = document.getElementById("mediaFoldersGrid");

    // Si le clic n'est pas dans un menu ou un bouton kebab (médias), fermer les menus médias
    if (
      mediaListGrid &&
      !e.target.closest(".media-menu") &&
      !e.target.closest("[data-media-menu-btn]")
    ) {
      closeAllMediaMenus();
    }

    // Si le clic n'est pas dans un menu ou un bouton kebab (dossiers), fermer les menus dossiers
    if (
      foldersGrid &&
      !e.target.closest(".folder-menu") &&
      !e.target.closest("[data-folder-menu-btn]")
    ) {
      closeAllFolderMenus();
    }
  });

  // ADDED: Fermer le menu avec ESC
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (openMediaMenuId) {
        closeAllMediaMenus();
      }
      if (openFolderMenuName) {
        closeAllFolderMenus();
      }
      // ADDED: Fermer la modal de renommage avec ESC
      const renameModal = document.getElementById("renameFolderModal");
      if (renameModal && renameModal.classList.contains("is-open")) {
        closeRenameFolderModal();
      }
    }
  });

  // ADDED: Recherche en live dans le picker média
  const mediaSearchInput = document.getElementById("mediaSearchInput");
  if (mediaSearchInput) {
    mediaSearchInput.addEventListener("input", function () {
      renderMediaPickerList();
    });
  }

  // ADDED: Filtre de dossier dans le picker
  const mediaPickerFolderFilter = document.getElementById(
    "mediaPickerFolderFilter",
  );
  if (mediaPickerFolderFilter) {
    mediaPickerFolderFilter.addEventListener("change", function () {
      renderMediaPickerList();
    });
  }

  // ADDED: Event delegation pour les actions du picker média (utiliser/copier/supprimer)
  document.addEventListener("click", function (e) {
    const pickerList = document.getElementById("mediaPickerList");
    if (!pickerList || !pickerList.contains(e.target)) return;

    const useBtn = e.target.closest("[data-media-use]");
    const copyBtn = e.target.closest("[data-media-copy]");
    const deleteBtn = e.target.closest("[data-media-delete]");

    if (useBtn) {
      const url = useBtn.dataset.mediaUse;
      if (url && window.currentMediaTarget) {
        const target = window.currentMediaTarget;
        if (target === "game") {
          const coverInput = document.getElementById("game-cover");
          if (coverInput) {
            coverInput.value = url;
            updateCoverPreview(url);
          }
        } else if (target === "article") {
          const coverInput = document.getElementById("article-cover");
          if (coverInput) {
            coverInput.value = url;
            updateArticleCoverPreview(url);
          }
        } else if (target === "test") {
          const coverInput = document.getElementById("test-cover");
          if (coverInput) {
            coverInput.value = url;
            updateTestCoverPreview(url);
          }
        } else if (target === "bon-plan") {
          const coverInput = document.getElementById("bon-plan-cover");
          if (coverInput) {
            coverInput.value = url;
            updateBonPlanCoverPreview(url);
          }
        } else if (target === "promo") {
          // ADDED: Gérer le cas des promos
          if (window.__mediaPickerTarget) {
            const { type, targetInput, onSelect } = window.__mediaPickerTarget;
            if (type === "promo" && targetInput) {
              let chosenValue = url;
              const mediaId =
                useBtn.closest("[data-media-id]")?.dataset?.mediaId;
              if (mediaId) {
                const mediaList = getMediaData();
                const media = mediaList.find((m) => toText(m.id) === mediaId);
                if (media) {
                  if (
                    media.url &&
                    (media.url.startsWith("http://") ||
                      media.url.startsWith("https://"))
                  ) {
                    chosenValue = media.url;
                  } else if (media.dataUrl) {
                    chosenValue = media.dataUrl;
                  } else if (media.base64) {
                    chosenValue = media.base64;
                  } else {
                    chosenValue = media.url || url;
                  }
                }
              }
              // Utiliser onSelect si fourni, sinon mettre à jour directement
              if (onSelect && typeof onSelect === "function") {
                onSelect(chosenValue);
              } else {
                targetInput.value = chosenValue;
                targetInput.dispatchEvent(
                  new Event("input", { bubbles: true }),
                );
                targetInput.dispatchEvent(
                  new Event("change", { bubbles: true }),
                );
              }
              window.__mediaPickerTarget = null;
              closeMediaPickerModal();
              return;
            }
            // Fallback: ancien format (target direct sans blockEl)
            if (
              window.__mediaPickerTarget.target &&
              !window.__mediaPickerTarget.blockEl
            ) {
              const { target: targetInput } = window.__mediaPickerTarget;
              let chosenValue = url;
              const mediaId =
                useBtn.closest("[data-media-id]")?.dataset?.mediaId;
              if (mediaId) {
                const mediaList = getMediaData();
                const media = mediaList.find((m) => toText(m.id) === mediaId);
                if (media) {
                  if (
                    media.url &&
                    (media.url.startsWith("http://") ||
                      media.url.startsWith("https://"))
                  ) {
                    chosenValue = media.url;
                  } else if (media.dataUrl) {
                    chosenValue = media.dataUrl;
                  } else if (media.base64) {
                    chosenValue = media.base64;
                  } else {
                    chosenValue = media.url || url;
                  }
                }
              }
              if (targetInput) {
                targetInput.value = chosenValue;
                targetInput.dispatchEvent(
                  new Event("input", { bubbles: true }),
                );
                targetInput.dispatchEvent(
                  new Event("change", { bubbles: true }),
                );
              }
              window.__mediaPickerTarget = null;
              closeMediaPickerModal();
              return;
            }
          }
        } else if (target === "article-block") {
          // ADDED: Vérifier si c'est pour l'avatar image
          if (window.__mediaTargetAvatarImage) {
            const avatarImageUrlInput = document.getElementById(
              "team-member-avatar-image-url",
            );
            const cropImg = document.getElementById("avatarCropImg");
            if (avatarImageUrlInput) {
              let chosenValue = url;
              const mediaId =
                useBtn.closest("[data-media-id]")?.dataset?.mediaId;
              if (mediaId) {
                const mediaList = getMediaData();
                const media = mediaList.find((m) => toText(m.id) === mediaId);
                if (media) {
                  if (
                    media.url &&
                    (media.url.startsWith("http://") ||
                      media.url.startsWith("https://"))
                  ) {
                    chosenValue = media.url;
                  } else if (media.dataUrl) {
                    chosenValue = media.dataUrl;
                  } else if (media.base64) {
                    chosenValue = media.base64;
                  } else {
                    chosenValue = media.url || url;
                  }
                }
              }
              avatarImageUrlInput.value = chosenValue;
              // ADDED: Déclencher l'event 'input' pour que le cropper se mette à jour automatiquement
              avatarImageUrlInput.dispatchEvent(
                new Event("input", { bubbles: true }),
              );
              // Le listener sur l'input va mettre à jour cropImg.src et réinitialiser le crop
            }
            window.__mediaTargetAvatarImage = null;
            closeMediaPickerModal();
            return;
          }

          // ADDED: Gérer le cas des promos (target direct sans blockEl)
          if (
            window.__mediaPickerTarget &&
            window.__mediaPickerTarget.target &&
            !window.__mediaPickerTarget.blockEl
          ) {
            const { target } = window.__mediaPickerTarget;
            let chosenValue = url;
            const mediaId = useBtn.closest("[data-media-id]")?.dataset?.mediaId;
            if (mediaId) {
              const mediaList = getMediaData();
              const media = mediaList.find((m) => toText(m.id) === mediaId);
              if (media) {
                if (
                  media.url &&
                  (media.url.startsWith("http://") ||
                    media.url.startsWith("https://"))
                ) {
                  chosenValue = media.url;
                } else if (media.dataUrl) {
                  chosenValue = media.dataUrl;
                } else if (media.base64) {
                  chosenValue = media.base64;
                } else {
                  chosenValue = media.url || url;
                }
              }
            }
            target.value = chosenValue;
            target.dispatchEvent(new Event("input", { bubbles: true }));
            target.dispatchEvent(new Event("change", { bubbles: true }));
            window.__mediaPickerTarget = null;
            closeMediaPickerModal();
            return;
          }

          // PATCH B: AU RETOUR DU PICKER : ÉCRIRE DANS LA CIBLE (OFFRE)
          if (
            window.__mediaPickerTarget &&
            window.__mediaPickerTarget.blockEl
          ) {
            const { blockEl, target } = window.__mediaPickerTarget;

            // Récupérer l'URL finale
            let chosenValue = url;
            const mediaId = useBtn.closest("[data-media-id]")?.dataset?.mediaId;
            if (mediaId) {
              const mediaList = getMediaData();
              const media = mediaList.find((m) => toText(m.id) === mediaId);
              if (media) {
                // Priorité: media.url si c'est une URL http(s), sinon media.dataUrl/base64
                if (
                  media.url &&
                  (media.url.startsWith("http://") ||
                    media.url.startsWith("https://"))
                ) {
                  chosenValue = media.url;
                } else if (media.dataUrl) {
                  chosenValue = media.dataUrl;
                } else if (media.base64) {
                  chosenValue = media.base64;
                } else {
                  chosenValue = media.url || url;
                }
              }
            }

            // fallback si target introuvable au moment du click
            const realTarget =
              target ||
              blockEl.querySelector('input[data-field="imageUrl"]') ||
              blockEl.querySelector('input[placeholder*="URL de l\'image"]') ||
              blockEl.querySelector('input[name*="image"]') ||
              blockEl.querySelector('input[id*="image"]');

            // persiste sur dataset du bloc (backup)
            blockEl.dataset.imageUrl = chosenValue;

            // CHECKPOINT A: Log value APRÈS sélection
            const valueAfter = realTarget?.value || "";

            if (realTarget) {
              realTarget.value = chosenValue;
              realTarget.dispatchEvent(new Event("input", { bubbles: true }));
              realTarget.dispatchEvent(new Event("change", { bubbles: true }));

              // CHECKPOINT A: Log value APRÈS écriture
            } else {
              // CHECKPOINT A: Log si realTarget non trouvé
            }

            // Mettre à jour l'état articleBlocks immédiatement
            syncArticleBlocksFromDOM();
            console.log("[admin] image replaced (offer)", {
              blockId: blockEl.dataset.blockId || "unknown",
              url: chosenValue.substring(0, 50) + "...",
              inputValue: realTarget?.value?.substring(0, 50) + "...",
            });

            // reset
            window.__mediaPickerTarget = null;
            // Fermer la modal
            closeMediaPickerModal();
            return;
          }

          // ADDED: Utiliser la référence directe de l'input mémorisée (plus fiable) - pour blocs image
          const urlInput = window.__mediaTargetInput;
          if (urlInput) {
            // ADDED: Récupérer la dataURL du média si disponible (priorité sur URL http)
            let chosenValue = url;
            const mediaId = useBtn.closest("[data-media-id]")?.dataset?.mediaId;
            if (mediaId) {
              const mediaList = getMediaData();
              const media = mediaList.find((m) => toText(m.id) === mediaId);
              if (media) {
                // Priorité: media.url si c'est une URL http(s), sinon media.dataUrl/base64
                if (
                  media.url &&
                  (media.url.startsWith("http://") ||
                    media.url.startsWith("https://"))
                ) {
                  chosenValue = media.url;
                } else if (media.dataUrl) {
                  chosenValue = media.dataUrl;
                } else if (media.base64) {
                  chosenValue = media.base64;
                } else {
                  chosenValue = media.url || url;
                }
              }
            }

            // FORCER la mise à jour de l'input
            urlInput.value = chosenValue;
            // FORCER la synchro complète : déclencher input ET change pour mettre à jour preview + état
            urlInput.dispatchEvent(new Event("input", { bubbles: true }));
            urlInput.dispatchEvent(new Event("change", { bubbles: true }));
            // ADDED: Mettre à jour l'état articleBlocks immédiatement (lit depuis urlInput.value)
            syncArticleBlocksFromDOM();
            // ADDED: Log pour debug
            const blockEl = urlInput.closest(".article-block-item");
            const blockId = blockEl?.dataset?.blockId;
            const blockIndex = blockEl?.dataset?.blockIndex;
            console.log("[admin] image replaced", {
              blockId: blockId || "unknown",
              blockIndex,
              url: chosenValue.substring(0, 50) + "...",
              inputValue: urlInput.value.substring(0, 50) + "...",
            });

            // PATCH A: Écrire aussi dans dataset (robuste) pour persister l'URL même si l'input est perdu
            if (blockEl) {
              blockEl.dataset.imageUrl = chosenValue; // chosenValue = l'URL finale de l'image
              // Tente aussi de remplir l'input visible si présent (au cas où il n'a pas été trouvé avant)
              const imgInput =
                blockEl.querySelector(
                  'input[placeholder*="URL de l\'image"]',
                ) ||
                blockEl.querySelector('input[data-field="imageUrl"]') ||
                blockEl.querySelector('input[name*="image"]') ||
                blockEl.querySelector('input[id*="image"]');
              if (imgInput && imgInput !== urlInput) {
                imgInput.value = chosenValue;
                imgInput.dispatchEvent(new Event("input", { bubbles: true }));
                imgInput.dispatchEvent(new Event("change", { bubbles: true }));
              }
            }

            // Fermer la modal
            closeMediaPickerModal();
          }
          // Nettoyer les références
          window.__mediaTargetInput = null;
          currentBlockImageIndex = null;
        } else if (target === "team") {
          // ADDED: Remplir l'avatar équipe depuis médiathèque
          const avatarMediaIdInput = document.getElementById(
            "team-member-avatar-media-id",
          );
          const avatarTypeSelect = document.getElementById(
            "team-member-avatar-type",
          );
          if (avatarMediaIdInput && avatarTypeSelect) {
            // Trouver le média par URL pour récupérer son ID
            const mediaList = getMediaData();
            const media = mediaList.find((m) => toText(m.url) === toText(url));
            if (media) {
              avatarMediaIdInput.value = toText(media.id);
              avatarTypeSelect.value = "media";
              toggleAvatarTypeFields("media");
              updateTeamMemberPhotoPreview(url);
            }
          }
        }
        // ADDED: Mettre à jour lastUsedAt du média
        updateMediaLastUsed(url);
        closeMediaPickerModal();
      }
      e.preventDefault();
      e.stopPropagation();
    }

    if (copyBtn) {
      const url = copyBtn.dataset.mediaCopy;
      if (url) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(url)
            .then(() => {
              copyBtn.textContent = "Copié !";
              setTimeout(() => {
                copyBtn.textContent = "Copier";
              }, 2000);
            })
            .catch(() => {
              // Fallback: sélectionner et copier
              const textarea = document.createElement("textarea");
              textarea.value = url;
              textarea.style.position = "fixed";
              textarea.style.opacity = "0";
              document.body.appendChild(textarea);
              textarea.select();
              try {
                document.execCommand("copy");
                copyBtn.textContent = "Copié !";
                setTimeout(() => {
                  copyBtn.textContent = "Copier";
                }, 2000);
              } catch (err) {
                // Silencieux
              }
              document.body.removeChild(textarea);
            });
        } else {
          // Fallback: sélectionner et copier
          const textarea = document.createElement("textarea");
          textarea.value = url;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand("copy");
            copyBtn.textContent = "Copié !";
            setTimeout(() => {
              copyBtn.textContent = "Copier";
            }, 2000);
          } catch (err) {
            // Silencieux
          }
          document.body.removeChild(textarea);
        }
      }
      e.preventDefault();
      e.stopPropagation();
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.mediaDelete;
      // ADDED: Utiliser la fonction centralisée deleteMedia
      deleteMedia(id);
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // ADDED: Event listeners pour les boutons de navigation des médias
  const mediaBackBtn = document.getElementById("mediaBackBtn");
  if (mediaBackBtn) {
    mediaBackBtn.addEventListener("click", function () {
      currentMediaFolder = null;
      renderMediaSection();
    });
  }

  const createFolderBtn = document.getElementById("createFolderBtn");
  if (createFolderBtn) {
    createFolderBtn.addEventListener("click", function () {
      createFolder();
    });
  }

  // ADDED: Event listeners pour le modal de renommage de dossier
  const btnCancelRenameFolder = document.getElementById(
    "btn-cancel-rename-folder",
  );
  const btnCloseRenameFolder = document.getElementById(
    "renameFolderModalCloseBtn",
  );
  const overlayRenameFolder = document.getElementById(
    "renameFolderModalOverlay",
  );
  const renameFolderForm = document.getElementById("renameFolderForm");
  const renameFolderInput = document.getElementById("renameFolderInput");

  if (btnCancelRenameFolder) {
    btnCancelRenameFolder.addEventListener("click", closeRenameFolderModal);
  }

  if (btnCloseRenameFolder) {
    btnCloseRenameFolder.addEventListener("click", closeRenameFolderModal);
  }

  if (overlayRenameFolder) {
    overlayRenameFolder.addEventListener("click", closeRenameFolderModal);
  }

  if (renameFolderForm) {
    renameFolderForm.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!currentRenameFolderName) return;

      const newName = renameFolderInput.value;

      // Validation
      if (!validateRenameFolderInput(newName, currentRenameFolderName)) {
        return;
      }

      // Appliquer le renommage
      renameFolder(currentRenameFolderName, newName);
      closeRenameFolderModal();
    });
  }

  // ADDED: Validation en temps réel
  if (renameFolderInput) {
    renameFolderInput.addEventListener("input", function () {
      if (currentRenameFolderName) {
        validateRenameFolderInput(this.value, currentRenameFolderName);
      }
    });
  }

  // ADDED: Event listeners pour le modal de déplacement
  const btnCancelMoveMedia = document.getElementById("btn-cancel-move-media");
  const btnConfirmMoveMedia = document.getElementById("btn-confirm-move-media");
  const btnCloseMoveMedia = document.getElementById("moveMediaModalCloseBtn");
  const overlayMoveMedia = document.getElementById("moveMediaModalOverlay");

  if (btnCancelMoveMedia) {
    btnCancelMoveMedia.addEventListener("click", closeMoveMediaModal);
  }

  if (btnCloseMoveMedia) {
    btnCloseMoveMedia.addEventListener("click", closeMoveMediaModal);
  }

  if (overlayMoveMedia) {
    overlayMoveMedia.addEventListener("click", closeMoveMediaModal);
  }

  if (btnConfirmMoveMedia) {
    btnConfirmMoveMedia.addEventListener("click", function () {
      const select = document.getElementById("moveMediaFolderSelect");
      if (select && currentMoveMediaId) {
        const folderName = select.value;

        // ADDED: Récupérer le dossier actuel pour éviter les déplacements inutiles
        const mediaList = getMediaData();
        const media = mediaList.find(
          (m) => toText(m.id) === currentMoveMediaId,
        );
        const currentFolder = media
          ? toText(media.folder) || "Non classé"
          : "Non classé";

        if (folderName && folderName !== currentFolder) {
          moveMediaToFolder(currentMoveMediaId, folderName);
          closeMoveMediaModal();
        } else {
          // ADDED: Si on tente de déplacer vers le même dossier, fermer proprement
          closeMoveMediaModal();
        }
      }
    });

    // ADDED: Listener sur le select pour activer/désactiver le bouton
    const select = document.getElementById("moveMediaFolderSelect");
    if (select) {
      select.addEventListener("change", function () {
        if (!currentMoveMediaId) return;

        const mediaList = getMediaData();
        const media = mediaList.find(
          (m) => toText(m.id) === currentMoveMediaId,
        );
        const currentFolder = media
          ? toText(media.folder) || "Non classé"
          : "Non classé";

        const isCurrent = this.value === currentFolder;
        btnConfirmMoveMedia.disabled = isCurrent;
        btnConfirmMoveMedia.style.opacity = isCurrent ? "0.5" : "1";
        btnConfirmMoveMedia.style.cursor = isCurrent
          ? "not-allowed"
          : "pointer";
      });
    }
  }

  // ADDED: Event listeners pour la dropbar (event delegation - une seule fois)
  const dropBarTargets = document.getElementById("mediaDropBarTargets");
  if (dropBarTargets) {
    dropBarTargets.addEventListener("dragover", function (e) {
      const dropTarget = e.target.closest(".media-drop-target");
      if (dropTarget) {
        // ADDED: Ne pas permettre le drop sur le dossier actuel
        if (dropTarget.dataset.isCurrent === "true") {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        dropTarget.classList.add("is-drop-target");
      }
    });

    dropBarTargets.addEventListener("dragleave", function (e) {
      const dropTarget = e.target.closest(".media-drop-target");
      if (dropTarget) {
        dropTarget.classList.remove("is-drop-target");
      }
    });

    dropBarTargets.addEventListener("drop", function (e) {
      const dropTarget = e.target.closest(".media-drop-target");
      if (dropTarget) {
        e.preventDefault();
        e.stopPropagation();
        dropTarget.classList.remove("is-drop-target");

        // ADDED: Empêcher le drop sur le dossier actuel
        if (dropTarget.dataset.isCurrent === "true") {
          hideDropBar();
          return;
        }

        const folderName = dropTarget.dataset.folder;
        const mediaId = e.dataTransfer.getData("text/plain") || draggedMediaId;

        if (folderName && mediaId) {
          // ADDED: Vérifier qu'on ne déplace pas vers le même dossier
          const mediaList = getMediaData();
          const media = mediaList.find((m) => toText(m.id) === mediaId);
          const currentFolder = media
            ? toText(media.folder) || "Non classé"
            : "Non classé";

          if (folderName !== currentFolder) {
            moveMediaToFolder(mediaId, folderName);
            hideDropBar();
            // ADDED: Re-render la vue courante (si on est dans un dossier, l'item doit disparaître)
            renderMediaSection();
          } else {
            hideDropBar();
          }
        }
      }
    });
  }

  // ADDED: Initialiser la liste des médias
  renderAdminMediaList();

  // ADDED: Mettre à jour le select de filtre des dossiers
  updateMediaFolderFilter();

  // ADDED: Initialisation Promos (appelée au chargement et quand l'onglet devient actif)
  initAdminPromoPage();

  // ADDED: Event listener pour le filtre de dossier
  const folderFilter = document.getElementById("mediaFolderFilter");
  if (folderFilter) {
    folderFilter.addEventListener("change", function () {
      renderAdminMediaList();
    });
  }

  // ADDED: Bouton nouveau dossier
  const btnNewFolder = document.getElementById("btn-new-folder");
  if (btnNewFolder) {
    btnNewFolder.addEventListener("click", function () {
      const folderName = prompt("Nom du dossier");
      if (folderName && folderName.trim()) {
        // ADDED: Ajouter le dossier au select (il sera créé quand un média l'utilisera)
        const folderFilter = document.getElementById("mediaFolderFilter");
        if (folderFilter) {
          const option = document.createElement("option");
          option.value = folderName.trim();
          option.textContent = folderName.trim();
          folderFilter.appendChild(option);
          folderFilter.value = folderName.trim();
          renderAdminMediaList();
        }
      }
    });
  }
}

/**
 * ADDED: Met à jour le select de filtre des dossiers avec les dossiers existants
 */
function updateMediaFolderFilter() {
  // ADDED: Guard pour protéger la home
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) return;

  const folderFilter = document.getElementById("mediaFolderFilter");
  if (!folderFilter) return;

  const mediaList = getMediaData();
  const folders = new Set();

  // Récupérer tous les dossiers uniques
  mediaList.forEach((media) => {
    const folder = toText(media.folder) || "Non classé";
    folders.add(folder);
  });

  // Trier les dossiers (sauf "Non classé" qui reste en haut)
  const sortedFolders = Array.from(folders).sort((a, b) => {
    if (a === "Non classé") return -1;
    if (b === "Non classé") return 1;
    return a.localeCompare(b);
  });

  // Sauvegarder la valeur actuelle
  const currentValue = folderFilter.value;

  // Reconstruire le select
  folderFilter.innerHTML = '<option value="">Tous</option>';
  sortedFolders.forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder;
    option.textContent = folder;
    folderFilter.appendChild(option);
  });

  // Restaurer la valeur si elle existe toujours
  if (currentValue && sortedFolders.includes(currentValue)) {
    folderFilter.value = currentValue;
  }
}

// ADDED: Event delegation pour fermer les modals via data-modal-close
document.addEventListener("click", function (e) {
  const btn = e.target.closest("[data-modal-close]");
  if (!btn) return;

  // Trouver le modal parent
  const modal = btn.closest(".admin-modal");
  if (!modal) return;

  // Déterminer quelle fonction de fermeture appeler
  const modalId = modal.id;
  if (modalId === "mediaModal") {
    closeMediaModal();
  } else if (modalId === "mediaPickerModal") {
    closeMediaPickerModal();
  } else {
    // Fallback générique
    modal.classList.remove("is-open");
  }

  e.preventDefault();
  e.stopPropagation();
});

// ADDED: Fermeture via clic sur overlay
document.addEventListener("click", function (e) {
  const overlay = e.target.closest(".admin-modal-overlay");
  if (!overlay) return;

  const modal = overlay.closest(".admin-modal");
  if (!modal || !modal.classList.contains("is-open")) return;

  // Ne pas fermer si le clic est dans le contenu
  if (e.target.closest(".admin-modal-content")) return;

  const modalId = modal.id;
  if (modalId === "mediaModal") {
    closeMediaModal();
  } else if (modalId === "mediaPickerModal") {
    closeMediaPickerModal();
  } else {
    modal.classList.remove("is-open");
  }
});

// ADDED: Fermeture via ESC (gestion centralisée pour tous les modals)
document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;

  // Trouver le modal ouvert
  const openModal = document.querySelector(".admin-modal.is-open");
  if (!openModal) return;

  const modalId = openModal.id;
  if (modalId === "mediaModal") {
    closeMediaModal();
  } else if (modalId === "mediaPickerModal") {
    closeMediaPickerModal();
  } else {
    openModal.classList.remove("is-open");
  }
});

// ============================================
// ADDED: GESTION MÉDIAS (CRUD + UI)
// ============================================

/**
 * ADDED: Génère un ID unique pour un média
 */
function generateMediaId(mediaList, baseId) {
  if (!baseId) baseId = "media";
  let id = baseId;
  let counter = 1;
  while (mediaList.some((m) => m.id === id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }
  return id;
}

/**
 * ADDED: Ouvre le modal pour ajouter un média
 */
function openMediaModal() {
  // ADDED: Guard pour protéger la home
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) return;

  const modal = document.getElementById("mediaModal");
  if (!modal) return;

  const form = document.getElementById("mediaForm");
  if (form) {
    form.reset();
  }

  updateMediaPreview("");
  modal.classList.add("is-open");
}

/**
 * ADDED: Ferme le modal média
 */
function closeMediaModal() {
  // ADDED: Guard pour protéger la home
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) return;

  const modal = document.getElementById("mediaModal");
  if (modal) {
    modal.classList.remove("is-open");
    const form = document.getElementById("mediaForm");
    if (form) {
      form.reset();
    }
    updateMediaPreview("");
  }
}

/**
 * ADDED: Met à jour le preview de l'image média
 */
function updateMediaPreview(url) {
  const previewImg = document.getElementById("mediaPreviewImg");
  const previewPlaceholder = document.getElementById("mediaPreviewPlaceholder");

  if (!previewImg || !previewPlaceholder) return;

  const urlTrimmed = toText(url);

  if (!urlTrimmed) {
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "block";
    previewPlaceholder.textContent = "Aperçu indisponible";
    return;
  }

  const img = new Image();

  img.onload = function () {
    try {
      previewImg.src = urlTrimmed;
      previewImg.style.display = "block";
      previewPlaceholder.style.display = "none";
    } catch (e) {
      previewImg.style.display = "none";
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Erreur d'affichage";
    }
  };

  img.onerror = function () {
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "block";
    previewPlaceholder.textContent = "Image introuvable";
  };

  try {
    img.src = urlTrimmed;
  } catch (e) {
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "block";
    previewPlaceholder.textContent = "URL invalide";
  }
}

/**
 * ADDED: Gère la soumission du formulaire média
 */
function handleMediaFormSubmit(e) {
  e.preventDefault();

  const urlInput = document.getElementById("media-url");
  if (!urlInput) return;

  const url = toText(urlInput.value);
  if (!url) {
    return;
  }

  const mediaList = getMediaData();
  const id = generateMediaId(mediaList);
  const now = new Date().toISOString();

  // ADDED: Si on est dans un dossier, utiliser ce dossier, sinon utiliser le champ
  const folderInput = document.getElementById("media-folder");
  let folder = "Non classé";

  if (currentMediaFolder !== null) {
    folder = currentMediaFolder;
  } else if (folderInput) {
    folder = toText(folderInput.value) || "Non classé";
  }

  const newMedia = {
    id,
    url,
    folder: folder,
    createdAt: now,
    usedIn: [],
  };

  mediaList.push(newMedia);
  saveMediaData(mediaList);
  renderMediaSection(); // ADDED: Utiliser renderMediaSection au lieu de renderAdminMediaList
  updateMediaFolderFilter();
  closeMediaModal();
}

/**
 * ADDED: Affiche la section médias (dossiers ou contenu d'un dossier)
 */
function renderMediaSection() {
  // ADDED: Guard pour protéger la home
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) return;

  if (currentMediaFolder === null) {
    renderMediaFoldersView();
  } else {
    renderMediaFolderContent(currentMediaFolder);
  }
}

/**
 * ADDED: Affiche la vue dossiers
 */
function renderMediaFoldersView() {
  const foldersGrid = document.getElementById("mediaFoldersGrid");
  const mediaListGrid = document.getElementById("mediaListGrid");
  const mediaBackBtn = document.getElementById("mediaBackBtn");
  const mediaTitle = document.getElementById("mediaTitle");

  if (!foldersGrid) return;

  // Cacher la vue médias, afficher la vue dossiers
  if (mediaListGrid) mediaListGrid.style.display = "none";
  foldersGrid.style.display = "grid";

  // Cacher le bouton retour, mettre à jour le titre, afficher le bouton créer dossier
  if (mediaBackBtn) mediaBackBtn.style.display = "none";
  if (mediaTitle) mediaTitle.textContent = "Dossiers";

  const createFolderBtn = document.getElementById("createFolderBtn");
  if (createFolderBtn) createFolderBtn.style.display = "inline-block";

  const folders = getAllMediaFolders();
  const mediaList = getMediaData();

  if (folders.length === 0) {
    foldersGrid.innerHTML = '<div class="empty-state">Aucun dossier</div>';
    return;
  }

  foldersGrid.innerHTML = folders
    .map((folder) => {
      // Compter les médias dans ce dossier
      const count = mediaList.filter(
        (m) => (toText(m.folder) || "Non classé") === folder,
      ).length;
      const isNonClasse = folder === "Non classé";

      return `
            <div class="media-folder-card" data-folder-name="${folder}" data-folder="${folder}" style="background: rgba(31, 42, 68, 0.3); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--spacing-md); cursor: pointer; transition: all var(--transition-base); position: relative;" onmouseover="this.style.background='rgba(31, 42, 68, 0.5)'; this.style.borderColor='rgba(59,130,246,0.3)';" onmouseout="this.style.background='rgba(31, 42, 68, 0.3)'; this.style.borderColor='var(--color-border)';">
                ${!isNonClasse ? `<button class="folder-kebab" type="button" aria-label="Actions dossier" data-folder-menu-btn="${folder}">⋯</button>` : ""}
                <div style="font-weight: var(--font-weight-medium); margin-bottom: var(--spacing-xs);">${folder}</div>
                <div style="font-size: 0.875em; color: var(--color-text-secondary);">${count} média${count > 1 ? "s" : ""}</div>
                ${
                  !isNonClasse
                    ? `<div class="folder-menu" data-folder-menu="${folder}" aria-hidden="true">
                    <button type="button" data-folder-action="rename" data-folder="${folder}">Renommer</button>
                    <button type="button" data-folder-action="delete" data-folder="${folder}">Supprimer</button>
                </div>`
                    : ""
                }
            </div>
        `;
    })
    .join("");

  // ADDED: Event delegation pour les clics sur les dossiers
  foldersGrid.addEventListener("click", function (e) {
    // ADDED: Ne pas naviguer si on clique sur le kebab ou le menu
    if (e.target.closest(".folder-kebab") || e.target.closest(".folder-menu")) {
      return;
    }

    const folderCard = e.target.closest(".media-folder-card");
    if (!folderCard) return;

    const folderName = folderCard.dataset.folderName;
    if (folderName) {
      currentMediaFolder = folderName;
      renderMediaSection();
    }
  });

  // ADDED: Event delegation pour le menu des dossiers
  foldersGrid.addEventListener("click", function (e) {
    // Toggle menu
    const kebabBtn = e.target.closest("[data-folder-menu-btn]");
    if (kebabBtn) {
      e.preventDefault();
      e.stopPropagation();
      const folderName = kebabBtn.dataset.folderMenuBtn;
      toggleFolderMenu(folderName);
      return;
    }

    // Actions du menu
    const actionBtn = e.target.closest("[data-folder-action]");
    if (actionBtn) {
      e.preventDefault();
      e.stopPropagation();
      const action = actionBtn.dataset.folderAction;
      const folderName = actionBtn.dataset.folder;
      handleFolderMenuAction(action, folderName);
      return;
    }
  });

  // ADDED: Event listeners pour le drag & drop sur les dossiers
  foldersGrid.addEventListener("dragover", function (e) {
    // ADDED: Empêcher le drag sur le kebab
    if (e.target.closest(".folder-kebab") || e.target.closest(".folder-menu")) {
      return;
    }

    const folderCard = e.target.closest(".media-folder-card");
    if (folderCard) {
      e.preventDefault();
      e.stopPropagation();
      folderCard.classList.add("is-drop-target");
    }
  });

  foldersGrid.addEventListener("dragleave", function (e) {
    // ADDED: Empêcher le dragleave sur le kebab
    if (e.target.closest(".folder-kebab") || e.target.closest(".folder-menu")) {
      return;
    }

    const folderCard = e.target.closest(".media-folder-card");
    if (folderCard) {
      folderCard.classList.remove("is-drop-target");
    }
  });

  foldersGrid.addEventListener("drop", function (e) {
    // ADDED: Empêcher le drop sur le kebab
    if (e.target.closest(".folder-kebab") || e.target.closest(".folder-menu")) {
      return;
    }

    const folderCard = e.target.closest(".media-folder-card");
    if (folderCard) {
      e.preventDefault();
      e.stopPropagation();
      folderCard.classList.remove("is-drop-target");

      const folderName =
        folderCard.dataset.folder || folderCard.dataset.folderName;
      const mediaId = e.dataTransfer.getData("text/plain") || draggedMediaId;

      if (folderName && mediaId) {
        moveMediaToFolder(mediaId, folderName);
        // ADDED: Re-render la vue Dossiers pour mettre à jour les compteurs, rester en vue Dossiers
        if (currentMediaFolder === null) {
          renderMediaFoldersView();
        }
      }
    }
  });
}

/**
 * ADDED: Affiche le contenu d'un dossier
 */
function renderMediaFolderContent(folder) {
  const foldersGrid = document.getElementById("mediaFoldersGrid");
  const mediaListGrid = document.getElementById("mediaListGrid");
  const mediaBackBtn = document.getElementById("mediaBackBtn");
  const mediaTitle = document.getElementById("mediaTitle");

  if (!mediaListGrid) return;

  // Cacher la vue dossiers, afficher la vue médias
  if (foldersGrid) foldersGrid.style.display = "none";
  mediaListGrid.style.display = "grid";
  mediaListGrid.style.gridTemplateColumns =
    "repeat(auto-fill, minmax(280px, 1fr))";
  mediaListGrid.style.gap = "var(--spacing-lg)";

  // Afficher le bouton retour, mettre à jour le titre, cacher le bouton créer dossier
  if (mediaBackBtn) {
    mediaBackBtn.style.display = "inline-block";
  }
  if (mediaTitle) mediaTitle.textContent = folder;

  const createFolderBtn = document.getElementById("createFolderBtn");
  if (createFolderBtn) createFolderBtn.style.display = "none";

  const mediaList = getMediaData();
  const folderMedia = mediaList.filter(
    (m) => (toText(m.folder) || "Non classé") === folder,
  );

  if (folderMedia.length === 0) {
    mediaListGrid.innerHTML =
      '<div class="empty-state">Aucun média dans ce dossier</div>';
    return;
  }

  // ADDED: Réinitialiser le flag du listener pour permettre la réattache après re-render
  delete mediaListGrid.dataset.hasMediaMenuListener;

  mediaListGrid.innerHTML = folderMedia
    .map((media) => {
      const urlTruncated =
        media.url.length > 50 ? media.url.substring(0, 50) + "..." : media.url;
      const id = toText(media.id);
      const mediaFolder = toText(media.folder) || "Non classé";

      return `
            <div class="media-card" data-media-id="${id}" draggable="true" style="position: relative;">
                <div class="media-thumb">
                    <img src="${media.url}" alt="Preview" onerror="this.parentElement.innerHTML='<div style=\'color: var(--color-text-secondary); font-size: 0.75em; padding: var(--spacing-sm);\'>Erreur</div>'">
                    <button class="media-kebab" type="button" aria-label="Actions média" data-media-menu-btn="${id}">⋯</button>
                </div>
                <div class="media-meta">
                    <div class="media-folder-label">${mediaFolder}</div>
                    <div class="media-url">${urlTruncated}</div>
                </div>
                <div class="media-menu" data-media-menu="${id}" aria-hidden="true">
                    <button type="button" data-media-action="copy" data-id="${id}" data-media-url="${media.url}">Copier l'URL</button>
                    <button type="button" data-media-action="move" data-id="${id}">Déplacer…</button>
                    <button type="button" data-media-action="delete" data-id="${id}">Supprimer</button>
                </div>
            </div>
        `;
    })
    .join("");

  // ADDED: Event listeners pour le drag & drop
  const mediaItems = mediaListGrid.querySelectorAll(".media-card");
  mediaItems.forEach((item) => {
    item.addEventListener("dragstart", function (e) {
      // Empêcher le drag si on clique sur le bouton kebab ou le menu
      if (e.target.closest(".media-kebab") || e.target.closest(".media-menu")) {
        e.preventDefault();
        return;
      }

      const mediaId = this.dataset.mediaId;
      if (mediaId) {
        draggedMediaId = mediaId;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", mediaId);
        this.classList.add("is-dragging");
        // ADDED: Afficher la barre de drop en haut
        showDropBar();
      }
    });

    item.addEventListener("dragend", function (e) {
      this.classList.remove("is-dragging");
      // ADDED: Cacher la barre de drop
      hideDropBar();
    });
  });

  // ADDED: Event listeners pour le menu kebab (event delegation) - une seule fois
  // Vérifier si l'event listener n'existe pas déjà pour éviter les doublons
  if (!mediaListGrid.dataset.hasMediaMenuListener) {
    mediaListGrid.dataset.hasMediaMenuListener = "true";
    mediaListGrid.addEventListener("click", function (e) {
      // Toggle menu
      const kebabBtn = e.target.closest("[data-media-menu-btn]");
      if (kebabBtn) {
        e.preventDefault();
        e.stopPropagation();
        const mediaId =
          kebabBtn.dataset.mediaMenuBtn ||
          kebabBtn.getAttribute("data-media-menu-btn");
        if (mediaId) {
          toggleMediaMenu(mediaId);
        } else {
          console.warn("[admin] No mediaId found on kebab button");
        }
        return;
      }

      // Actions du menu
      const actionBtn = e.target.closest("[data-media-action]");
      if (actionBtn) {
        e.preventDefault();
        e.stopPropagation();
        const action = actionBtn.dataset.mediaAction;
        const mediaId = actionBtn.dataset.id;
        if (action && mediaId) {
          handleMediaMenuAction(action, mediaId, actionBtn);
        }
        return;
      }
    });
  }

  // ADDED: Event listeners pour les boutons de la drop zone
  const dropZoneList = document.getElementById("mediaDropZoneList");
  if (dropZoneList) {
    // Utiliser event delegation pour les boutons de la drop zone
    dropZoneList.addEventListener("dragover", function (e) {
      const folderBtn = e.target.closest(".media-dropzone-folder");
      if (folderBtn) {
        e.preventDefault();
        e.stopPropagation();
        folderBtn.classList.add("drag-over");
      }
    });

    dropZoneList.addEventListener("dragleave", function (e) {
      const folderBtn = e.target.closest(".media-dropzone-folder");
      if (folderBtn) {
        folderBtn.classList.remove("drag-over");
      }
    });

    dropZoneList.addEventListener("drop", function (e) {
      const folderBtn = e.target.closest(".media-dropzone-folder");
      if (folderBtn && draggedMediaId) {
        e.preventDefault();
        e.stopPropagation();
        const folderName = folderBtn.dataset.folderName;
        if (folderName) {
          moveMediaToFolder(draggedMediaId, folderName);
        }
        folderBtn.classList.remove("drag-over");
        hideMediaDropZone();
      }
    });
  }
}

/**
 * ADDED: Supprime un média
 */
function deleteMedia(id) {
  // ADDED: Guard pour protéger la home
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) return;

  if (!id) return;

  const mediaList = getMediaData();
  const media = mediaList.find((m) => toText(m.id) === id);
  if (!media) return;

  const mediaUrl = toText(media.url);

  // ADDED: Vérifier si le média est utilisé dans les jeux/articles
  const games = getGamesData();
  const articles = getArticlesData();

  const usedInGames = games.filter((g) => {
    const cover = toText(g.cover || g.image || "");
    return cover === mediaUrl || cover.includes(mediaUrl);
  });

  const usedInArticles = articles.filter((a) => {
    const cover = toText(a.cover || "");
    if (cover === mediaUrl || cover.includes(mediaUrl)) return true;

    // ADDED: Vérifier dans les blocs d'article
    const contentBlocks = a.contentBlocks || a.blocks || [];
    return contentBlocks.some((block) => {
      if (block.type === "image") {
        const blockUrl = toText(block.url || block.src || "");
        return blockUrl === mediaUrl || blockUrl.includes(mediaUrl);
      }
      return false;
    });
  });

  const isUsed = usedInGames.length > 0 || usedInArticles.length > 0;

  // ADDED: Confirmation avec avertissement si utilisé
  let confirmMessage = "Supprimer ce média ?";
  if (isUsed) {
    const gameCount = usedInGames.length;
    const articleCount = usedInArticles.length;
    const parts = [];
    if (gameCount > 0)
      parts.push(`${gameCount} jeu${gameCount > 1 ? "x" : ""}`);
    if (articleCount > 0)
      parts.push(`${articleCount} article${articleCount > 1 ? "s" : ""}`);
    confirmMessage = `Ce média est utilisé (${parts.join(", ")}). Supprimer quand même ? Les références seront nettoyées.`;
  }

  if (!confirm(confirmMessage)) return;

  // ADDED: Nettoyer les références dans les jeux
  if (usedInGames.length > 0) {
    games.forEach((game) => {
      const cover = toText(game.cover || game.image || "");
      if (cover === mediaUrl || cover.includes(mediaUrl)) {
        game.cover = "";
        game.image = "";
      }
    });
    saveGamesOverride(games);
  }

  // ADDED: Nettoyer les références dans les articles
  if (usedInArticles.length > 0) {
    articles.forEach((article) => {
      const cover = toText(article.cover || "");
      if (cover === mediaUrl || cover.includes(mediaUrl)) {
        article.cover = "";
      }

      // ADDED: Nettoyer les blocs image
      const contentBlocks = article.contentBlocks || article.blocks || [];
      contentBlocks.forEach((block) => {
        if (block.type === "image") {
          const blockUrl = toText(block.url || block.src || "");
          if (blockUrl === mediaUrl || blockUrl.includes(mediaUrl)) {
            block.url = "";
            block.src = "";
          }
        }
      });
    });
    saveArticlesOverride(articles);
  }

  // ADDED: Supprimer le média
  const filtered = mediaList.filter((m) => toText(m.id) !== id);
  saveMediaData(filtered);

  // ADDED: Fermer le menu contextuel
  closeAllMediaMenus();

  // ADDED: Re-render selon la vue actuelle (préserve currentMediaFolder)
  renderMediaSection();
  renderMediaPickerList(); // Re-render le picker aussi
  updateMediaFolderFilter();

  // ADDED: Re-render les listes admin si nécessaire
  if (usedInGames.length > 0) {
    renderAdminGamesList();
  }
  if (usedInArticles.length > 0) {
    renderAdminArticlesList();
  }
}

/**
 * ADDED: Crée un nouveau dossier
 */
function createFolder() {
  // ADDED: Guard pour protéger la home
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) return;

  // ADDED: Sécurité : ne peut être appelée que depuis la vue Dossiers
  if (currentMediaFolder !== null) {
    return;
  }

  const folderName = prompt("Nom du dossier");
  if (!folderName || !folderName.trim()) return;

  const trimmed = folderName.trim();

  // Vérifier qu'il n'existe pas déjà (case-insensitive)
  const existingFolders = getAllMediaFolders();
  const exists = existingFolders.some(
    (f) => f.toLowerCase() === trimmed.toLowerCase(),
  );

  if (exists) {
    alert("Ce dossier existe déjà");
    return;
  }

  // Ajouter aux dossiers vides
  const emptyFolders = getMediaFolders();
  emptyFolders.push(trimmed);
  saveMediaFolders(emptyFolders);

  // Re-render
  renderMediaSection();
}

/**
 * ADDED: Variable globale pour stocker l'ID du média en cours de drag
 */
let draggedMediaId = null;

/**
 * ADDED: Affiche la drop zone avec la liste des dossiers
 */
function showMediaDropZone() {
  const dropZone = document.getElementById("mediaDropZone");
  const dropZoneList = document.getElementById("mediaDropZoneList");

  if (!dropZone || !dropZoneList) return;

  const folders = getAllMediaFolders();

  dropZoneList.innerHTML = folders
    .map((folder) => {
      return `
            <button class="media-dropzone-folder" data-folder-name="${folder}" type="button">${folder}</button>
        `;
    })
    .join("");

  dropZone.classList.add("is-open");
  dropZone.setAttribute("aria-hidden", "false");
}

/**
 * ADDED: Cache la drop zone
 */
function hideMediaDropZone() {
  const dropZone = document.getElementById("mediaDropZone");
  if (!dropZone) return;

  dropZone.classList.remove("is-open");
  dropZone.setAttribute("aria-hidden", "true");
  draggedMediaId = null;
}

/**
 * ADDED: Affiche la barre de drop en haut avec tous les dossiers
 */
function showDropBar() {
  const dropBar = document.getElementById("mediaDropBar");
  const dropBarTargets = document.getElementById("mediaDropBarTargets");

  if (!dropBar || !dropBarTargets) return;

  // ADDED: Récupérer le dossier actuel du média draggé
  let currentFolder = "Non classé";
  if (draggedMediaId) {
    const mediaList = getMediaData();
    const media = mediaList.find((m) => toText(m.id) === draggedMediaId);
    if (media) {
      currentFolder = toText(media.folder) || "Non classé";
    }
  }

  const folders = getAllMediaFolders();

  if (folders.length === 0) {
    // Pas de dossiers, ne pas afficher la dropbar
    return;
  }

  dropBarTargets.innerHTML = folders
    .map((folder) => {
      const isCurrent = folder === currentFolder;
      return `
            <div class="media-drop-target ${isCurrent ? "is-current" : ""}" data-folder="${folder}" ${isCurrent ? 'data-is-current="true"' : ""}>${folder}${isCurrent ? " • Actuel" : ""}</div>
        `;
    })
    .join("");

  dropBar.classList.add("is-open");
  dropBar.setAttribute("aria-hidden", "false");
}

/**
 * ADDED: Cache la barre de drop
 */
function hideDropBar() {
  const dropBar = document.getElementById("mediaDropBar");
  if (!dropBar) return;

  dropBar.classList.remove("is-open");
  dropBar.setAttribute("aria-hidden", "true");
}

/**
 * ADDED: Déplace un média vers un dossier
 */
function moveMediaToFolder(mediaId, folderName) {
  if (!mediaId || !folderName) return;

  const mediaList = getMediaData();
  const media = mediaList.find((m) => toText(m.id) === mediaId);

  if (!media) return;

  media.folder = folderName;
  saveMediaData(mediaList);

  // ADDED: Re-render selon la vue actuelle, mais rester en vue Dossiers si on y était
  const wasInFoldersView = currentMediaFolder === null;
  renderMediaSection();
  if (wasInFoldersView) {
    // S'assurer qu'on reste en vue Dossiers après le drop
    currentMediaFolder = null;
    renderMediaFoldersView();
  }
  renderMediaPickerList(); // Re-render le picker aussi
  updateMediaFolderFilter();
}

/**
 * ADDED: Variable globale pour stocker l'ID du média à déplacer
 */
let currentMoveMediaId = null;

/**
 * ADDED: Variable globale pour stocker le nom du dossier à renommer
 */
let currentRenameFolderName = null;

/**
 * ADDED: Ouvre le modal de déplacement
 */
function openMoveMediaModal(mediaId) {
  currentMoveMediaId = mediaId;
  const modal = document.getElementById("moveMediaModal");
  const select = document.getElementById("moveMediaFolderSelect");
  const confirmBtn = document.getElementById("btn-confirm-move-media");

  if (!modal || !select) return;

  // ADDED: Récupérer le dossier actuel du média
  const mediaList = getMediaData();
  const media = mediaList.find((m) => toText(m.id) === mediaId);
  const currentFolder = media
    ? toText(media.folder) || "Non classé"
    : "Non classé";

  // Remplir le select avec les dossiers
  const folders = getAllMediaFolders();
  select.innerHTML = folders
    .map((folder) => {
      const isCurrent = folder === currentFolder;
      return `<option value="${folder}" ${isCurrent ? "disabled" : ""}>${folder}${isCurrent ? " (actuel)" : ""}</option>`;
    })
    .join("");

  // ADDED: Pré-sélectionner le dossier actuel
  select.value = currentFolder;

  // ADDED: Désactiver le bouton "Déplacer" si on reste sur le dossier actuel
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = "0.5";
    confirmBtn.style.cursor = "not-allowed";
  }

  // Ouvrir le modal
  modal.classList.add("is-open");
}

/**
 * ADDED: Ferme le modal de déplacement
 */
function closeMoveMediaModal() {
  const modal = document.getElementById("moveMediaModal");
  const confirmBtn = document.getElementById("btn-confirm-move-media");

  if (modal) {
    modal.classList.remove("is-open");
  }

  // ADDED: Réinitialiser le bouton
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = "1";
    confirmBtn.style.cursor = "pointer";
  }

  currentMoveMediaId = null;
}

/**
 * ADDED: Ouvre la modal de renommage de dossier
 */
function openRenameFolderModal(folderName) {
  if (folderName === "Non classé") {
    return; // Sécurité : ne pas renommer "Non classé"
  }

  currentRenameFolderName = folderName;
  const modal = document.getElementById("renameFolderModal");
  const input = document.getElementById("renameFolderInput");
  const errorSpan = document.getElementById("error-rename-folder");

  if (!modal || !input) return;

  // Pré-remplir l'input avec le nom actuel
  input.value = folderName;

  // Réinitialiser l'erreur
  if (errorSpan) {
    errorSpan.textContent = "";
  }
  input.classList.remove("invalid", "is-invalid");

  // Ouvrir la modal
  modal.classList.add("is-open");

  // Focus auto sur l'input
  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);
}

/**
 * ADDED: Ferme la modal de renommage de dossier
 */
function closeRenameFolderModal() {
  const modal = document.getElementById("renameFolderModal");
  const input = document.getElementById("renameFolderInput");
  const errorSpan = document.getElementById("error-rename-folder");

  if (modal) {
    modal.classList.remove("is-open");
  }

  if (input) {
    input.value = "";
    input.classList.remove("invalid", "is-invalid");
  }

  if (errorSpan) {
    errorSpan.textContent = "";
  }

  currentRenameFolderName = null;
}

/**
 * ADDED: Valide le nom du dossier dans la modal
 */
function validateRenameFolderInput(newName, oldName) {
  const trimmed = newName.trim();
  const errorSpan = document.getElementById("error-rename-folder");
  const input = document.getElementById("renameFolderInput");

  if (!errorSpan || !input) return false;

  // Réinitialiser l'erreur
  errorSpan.textContent = "";
  input.classList.remove("invalid", "is-invalid");

  // Validation : nom non vide
  if (!trimmed) {
    errorSpan.textContent = "Le nom du dossier ne peut pas être vide";
    input.classList.add("invalid", "is-invalid");
    return false;
  }

  // Validation : vérifier qu'il n'existe pas déjà (case-insensitive)
  const folders = getAllMediaFolders();
  const exists = folders.some(
    (f) => f.toLowerCase() === trimmed.toLowerCase() && f !== oldName,
  );

  if (exists) {
    errorSpan.textContent = "Ce dossier existe déjà";
    input.classList.add("invalid", "is-invalid");
    return false;
  }

  return true;
}

/**
 * ADDED: Affiche la liste des médias dans l'admin (compatibilité, redirige vers renderMediaSection)
 */
function renderAdminMediaList() {
  // ADDED: Guard pour protéger la home
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) return;

  renderMediaSection();
}

/**
 * ADDED: Variable globale pour stocker l'ID du menu ouvert
 */
let openMediaMenuId = null;

/**
 * ADDED: Variable globale pour stocker le nom du menu dossier ouvert
 */
let openFolderMenuName = null;

/**
 * ADDED: Ouvre/ferme le menu d'un média
 */
function toggleMediaMenu(mediaId) {
  const menu = document.querySelector(`[data-media-menu="${mediaId}"]`);
  if (!menu) {
    console.warn("[admin] Menu not found for mediaId:", mediaId);
    return;
  }

  // Fermer tous les autres menus
  document.querySelectorAll(".media-menu").forEach((m) => {
    if (m !== menu) {
      m.setAttribute("aria-hidden", "true");
      m.classList.remove("is-open");
    }
  });

  // Toggle le menu actuel
  const isOpen = menu.classList.contains("is-open");
  if (isOpen) {
    menu.setAttribute("aria-hidden", "true");
    menu.classList.remove("is-open");
    openMediaMenuId = null;
  } else {
    menu.setAttribute("aria-hidden", "false");
    menu.classList.add("is-open");
    openMediaMenuId = mediaId;
  }
}

/**
 * ADDED: Ferme tous les menus
 */
function closeAllMediaMenus() {
  document.querySelectorAll(".media-menu").forEach((menu) => {
    menu.setAttribute("aria-hidden", "true");
    menu.classList.remove("is-open");
  });
  openMediaMenuId = null;
}

/**
 * ADDED: Ouvre/ferme le menu d'un dossier
 */
function toggleFolderMenu(folderName) {
  const menu = document.querySelector(`[data-folder-menu="${folderName}"]`);
  if (!menu) return;

  // Fermer tous les autres menus (médias et dossiers)
  document.querySelectorAll(".folder-menu").forEach((m) => {
    if (m !== menu) {
      m.setAttribute("aria-hidden", "true");
      m.classList.remove("is-open");
    }
  });
  closeAllMediaMenus();

  // Toggle le menu actuel
  const isOpen = menu.classList.contains("is-open");
  if (isOpen) {
    menu.setAttribute("aria-hidden", "true");
    menu.classList.remove("is-open");
    openFolderMenuName = null;
  } else {
    menu.setAttribute("aria-hidden", "false");
    menu.classList.add("is-open");
    openFolderMenuName = folderName;
  }
}

/**
 * ADDED: Ferme tous les menus de dossiers
 */
function closeAllFolderMenus() {
  document.querySelectorAll(".folder-menu").forEach((menu) => {
    menu.setAttribute("aria-hidden", "true");
    menu.classList.remove("is-open");
  });
  openFolderMenuName = null;
}

/**
 * ADDED: Gère les actions du menu dossier
 */
function handleFolderMenuAction(action, folderName) {
  closeAllFolderMenus();

  if (folderName === "Non classé") {
    return; // Sécurité : ne pas permettre les actions sur "Non classé"
  }

  switch (action) {
    case "rename":
      openRenameFolderModal(folderName);
      break;

    case "delete":
      deleteFolder(folderName);
      break;
  }
}

/**
 * ADDED: Renomme un dossier (logique métier, appelée depuis la modal)
 */
function renameFolder(oldName, newName) {
  if (oldName === "Non classé") {
    return; // Sécurité : ne pas renommer "Non classé"
  }

  const trimmed = newName.trim();

  // Mettre à jour tous les médias du dossier
  const mediaList = getMediaData();
  let updated = false;

  mediaList.forEach((media) => {
    const mediaFolder = toText(media.folder) || "Non classé";
    if (mediaFolder === oldName) {
      media.folder = trimmed;
      updated = true;
    }
  });

  // Mettre à jour les dossiers vides si nécessaire
  const emptyFolders = getMediaFolders();
  const folderIndex = emptyFolders.indexOf(oldName);
  if (folderIndex !== -1) {
    emptyFolders[folderIndex] = trimmed;
    saveMediaFolders(emptyFolders);
  }

  if (updated) {
    saveMediaData(mediaList);
  }

  // ADDED: Si on était dans ce dossier, basculer vers le nouveau nom
  if (currentMediaFolder === oldName) {
    currentMediaFolder = trimmed;
  }

  // Re-render la vue Dossiers
  renderMediaSection();
  updateMediaFolderFilter();
}

/**
 * ADDED: Supprime un dossier
 */
function deleteFolder(folderName) {
  if (folderName === "Non classé") {
    return; // Sécurité : ne pas supprimer "Non classé"
  }

  if (
    !confirm(
      `Supprimer le dossier "${folderName}" ? Les médias seront déplacés vers "Non classé".`,
    )
  ) {
    return;
  }

  // Déplacer tous les médias du dossier vers "Non classé"
  const mediaList = getMediaData();
  let updated = false;

  mediaList.forEach((media) => {
    const mediaFolder = toText(media.folder) || "Non classé";
    if (mediaFolder === folderName) {
      media.folder = "Non classé";
      updated = true;
    }
  });

  // Retirer le dossier de la liste des dossiers vides
  const emptyFolders = getMediaFolders();
  const folderIndex = emptyFolders.indexOf(folderName);
  if (folderIndex !== -1) {
    emptyFolders.splice(folderIndex, 1);
    saveMediaFolders(emptyFolders);
  }

  if (updated) {
    saveMediaData(mediaList);
  }

  // ADDED: Si on était dans ce dossier, revenir à la vue Dossiers
  if (currentMediaFolder === folderName) {
    currentMediaFolder = null;
  }

  // Re-render la vue Dossiers
  renderMediaSection();
  updateMediaFolderFilter();
}

/**
 * ADDED: Gère les actions du menu
 */
function handleMediaMenuAction(action, mediaId, actionBtn) {
  closeAllMediaMenus();

  switch (action) {
    case "use":
      const url = actionBtn.dataset.mediaUrl;
      if (url) {
        // Logique existante "Utiliser"
        const gameModal = document.getElementById("gameModal");
        const articleModal = document.getElementById("articleModal");

        if (gameModal && gameModal.classList.contains("is-open")) {
          const coverInput = document.getElementById("game-cover");
          if (coverInput) {
            coverInput.value = url;
            updateCoverPreview(url);
          }
        } else if (articleModal && articleModal.classList.contains("is-open")) {
          const coverInput = document.getElementById("article-cover");
          if (coverInput) {
            coverInput.value = url;
            updateArticleCoverPreview(url);
          }
        } else {
          navigator.clipboard
            .writeText(url)
            .then(() => {
              // Feedback silencieux
            })
            .catch(() => {});
        }
      }
      break;

    case "copy":
      const copyUrl = actionBtn.dataset.mediaUrl;
      if (copyUrl) {
        navigator.clipboard
          .writeText(copyUrl)
          .then(() => {
            // Feedback silencieux
          })
          .catch(() => {});
      }
      break;

    case "move":
      openMoveMediaModal(mediaId);
      break;

    case "delete":
      deleteMedia(mediaId);
      break;
  }
}

/**
 * ADDED: Gère les clics sur les boutons média (event delegation globale) - Legacy
 */
function handleMediaListClick(e) {
  const list = document.getElementById("adminMediaList");
  const mediaListGrid = document.getElementById("mediaListGrid");

  // Vérifier si le clic est dans adminMediaList ou mediaListGrid
  if (
    (!list || !list.contains(e.target)) &&
    (!mediaListGrid || !mediaListGrid.contains(e.target))
  ) {
    return;
  }

  const copyBtn = e.target.closest(".btn-copy-media");
  const useBtn = e.target.closest(".btn-use-media");
  const moveBtn = e.target.closest(".btn-move-media");
  const deleteBtn = e.target.closest(".btn-delete-media");

  if (copyBtn) {
    const url = copyBtn.dataset.mediaUrl;
    if (url) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          copyBtn.textContent = "Copié !";
          setTimeout(() => {
            copyBtn.textContent = "Copier";
          }, 2000);
        })
        .catch(() => {
          // Fallback silencieux
        });
    }
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  if (useBtn) {
    const url = useBtn.dataset.mediaUrl;
    if (url) {
      // ADDED: Si un modal est ouvert, utiliser directement
      const gameModal = document.getElementById("gameModal");
      const articleModal = document.getElementById("articleModal");

      if (gameModal && gameModal.classList.contains("is-open")) {
        const coverInput = document.getElementById("game-cover");
        if (coverInput) {
          coverInput.value = url;
          updateCoverPreview(url);
        }
      } else if (articleModal && articleModal.classList.contains("is-open")) {
        const coverInput = document.getElementById("article-cover");
        if (coverInput) {
          coverInput.value = url;
          updateArticleCoverPreview(url);
        }
      } else {
        // ADDED: Sinon, copier l'URL
        navigator.clipboard
          .writeText(url)
          .then(() => {
            useBtn.textContent = "Copié !";
            setTimeout(() => {
              useBtn.textContent = "Utiliser";
            }, 2000);
          })
          .catch(() => {
            // Fallback silencieux
          });
      }
    }
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // ADDED: Gérer le bouton déplacer
  if (moveBtn) {
    const id = moveBtn.dataset.mediaId;
    if (id) {
      openMoveMediaModal(id);
    }
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // ADDED: Gérer le bouton supprimer dans la vue dossier
  if (deleteBtn) {
    const id = deleteBtn.dataset.mediaDelete;
    if (id) {
      deleteMedia(id);
    }
    e.preventDefault();
    e.stopPropagation();
    return;
  }
}

/**
 * ADDED: Rend la liste des médias dans le picker (avec tri et filtre)
 */
function renderMediaPickerList() {
  const pickerList = document.getElementById("mediaPickerList");
  if (!pickerList) return;

  const searchInput = document.getElementById("mediaSearchInput");
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const folderFilter = document.getElementById("mediaPickerFolderFilter");
  const folderFilterValue = folderFilter ? folderFilter.value : "";

  let mediaList = getMediaData();

  // ADDED: Filtrer par dossier si un filtre est actif
  if (folderFilterValue) {
    mediaList = mediaList.filter((m) => toText(m.folder) === folderFilterValue);
  }

  // ADDED: Trier par createdAt desc (plus récents en premier)
  mediaList = mediaList.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB - dateA;
  });

  // ADDED: Filtrer par recherche (sur l'URL)
  if (searchTerm) {
    mediaList = mediaList.filter((media) => {
      const url = toText(media.url).toLowerCase();
      return url.includes(searchTerm);
    });
  }

  // ADDED: Mettre à jour le compteur
  const countEl = document.getElementById("mediaCount");
  if (countEl) {
    const total = getMediaData().length;
    const filtered = mediaList.length;
    if (searchTerm) {
      countEl.textContent = `${filtered} résultat${filtered > 1 ? "s" : ""} sur ${total}`;
    } else {
      countEl.textContent = `${total} média${total > 1 ? "s" : ""}`;
    }
  }

  if (mediaList.length === 0) {
    pickerList.innerHTML =
      '<div class="empty-state">Aucun média disponible' +
      (searchTerm ? ' pour "' + searchTerm + '"' : "") +
      "</div>";
  } else {
    pickerList.innerHTML = mediaList
      .map((media) => {
        const url = toText(media.url);
        const id = toText(media.id);
        const folder = toText(media.folder) || "Non classé";
        return `
                <div class="media-picker-item" data-media-id="${id}" data-media-url="${url}">
                    <div class="media-picker-preview">
                        <img src="${url}" alt="Preview" loading="lazy" onerror="this.parentElement.innerHTML='<div style=\'color: var(--color-text-secondary); font-size: 0.75em; padding: var(--spacing-sm);\'>Erreur</div>'">
                    </div>
                    <div style="font-size: 0.7em; color: var(--color-text-secondary); margin-top: var(--spacing-xs); text-align: center;">
                        <span style="background: rgba(59,130,246,0.15); color: var(--color-accent); padding: 2px 6px; border-radius: 4px;">${folder}</span>
                    </div>
                    <div class="media-picker-actions" style="display: flex; gap: var(--spacing-xs); margin-top: var(--spacing-xs);">
                        <button type="button" class="btn btn-primary" style="flex: 1; font-size: 0.875em; padding: var(--spacing-xs) var(--spacing-sm);" data-media-use="${url}">Utiliser</button>
                        <button type="button" class="btn btn-secondary" style="font-size: 0.875em; padding: var(--spacing-xs) var(--spacing-sm);" data-media-copy="${url}">Copier</button>
                        <button type="button" class="btn btn-cancel" style="font-size: 0.875em; padding: var(--spacing-xs) var(--spacing-sm);" data-media-delete="${id}">Supprimer</button>
                    </div>
                </div>
            `;
      })
      .join("");
  }
}

/**
 * ADDED: Ouvre le modal de sélection de média
 */
function openMediaPicker(target) {
  window.currentMediaTarget = target;
  const modal = document.getElementById("mediaPickerModal");
  if (!modal) {
    console.error("[media picker] Modal not found");
    return;
  }

  // ADDED: Réinitialiser la recherche
  const searchInput = document.getElementById("mediaSearchInput");
  if (searchInput) {
    searchInput.value = "";
  }

  // ADDED: Mettre à jour le select de filtre des dossiers dans le picker
  updateMediaPickerFolderFilter();

  // ADDED: Rendre la liste (avec tri et filtre)
  renderMediaPickerList();

  modal.classList.add("is-open");
}

// ADDED: Exposer openMediaPicker en global pour accès depuis tous les scopes
window.openMediaPicker = openMediaPicker;

/**
 * ADDED: Met à jour le select de filtre des dossiers dans le picker
 */
function updateMediaPickerFolderFilter() {
  const folderFilter = document.getElementById("mediaPickerFolderFilter");
  if (!folderFilter) return;

  const mediaList = getMediaData();
  const folders = new Set();

  // Récupérer tous les dossiers uniques
  mediaList.forEach((media) => {
    const folder = toText(media.folder) || "Non classé";
    folders.add(folder);
  });

  // Trier les dossiers (sauf "Non classé" qui reste en haut)
  const sortedFolders = Array.from(folders).sort((a, b) => {
    if (a === "Non classé") return -1;
    if (b === "Non classé") return 1;
    return a.localeCompare(b);
  });

  // Sauvegarder la valeur actuelle
  const currentValue = folderFilter.value;

  // Reconstruire le select
  folderFilter.innerHTML = '<option value="">Tous les dossiers</option>';
  sortedFolders.forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder;
    option.textContent = folder;
    folderFilter.appendChild(option);
  });

  // Restaurer la valeur si elle existe toujours
  if (currentValue && sortedFolders.includes(currentValue)) {
    folderFilter.value = currentValue;
  }
}

/**
 * ADDED: Ferme le modal de sélection de média
 */
function closeMediaPickerModal() {
  const modal = document.getElementById("mediaPickerModal");
  if (modal) {
    modal.classList.remove("is-open");
    window.currentMediaTarget = null;
    // ADDED: Nettoyer aussi la référence de l'input ciblé
    window.__mediaTargetInput = null;
  }
}

/**
 * ADDED: Gère la soumission du formulaire article
 */
function handleArticleFormSubmit(e) {
  e.preventDefault();

  console.log("[admin] click save article");
  window.__debugLastAction = "saveArticleClicked";

  try {
    clearArticleFormErrors();

    // ADDED: Synchroniser les blocs depuis le DOM avant de lire le formulaire
    syncArticleBlocksFromDOM();

    const payload = readArticleForm();

    // Sécurité : empêcher toute tentative de sauvegarde avec category = "test"
    if (payload.category === "test") {
      showArticleFormErrors({
        "article-category":
          "La catégorie Tests n'est plus disponible. Utilise la section Tests dédiée.",
      });
      console.error(
        '[admin] Tentative de sauvegarde d\'article avec catégorie "test" bloquée',
      );
      return;
    }

    // PATCH C: DEBUG PROUVE TOUT DE SUITE - afficher imageUrl du bloc offre dans le payload
    const offerDebug = (payload.contentBlocks || payload.blocks || []).find(
      (b) => {
        const t = (b.type || "").toLowerCase();
        return t === "offer" || t === "affiliation";
      },
    );
    console.log(
      "[DEBUG payload offer imageUrl]",
      offerDebug?.imageUrl,
      offerDebug,
    );

    normalizeArticlePayload(payload);

    const validation = validateArticle(payload);

    if (!validation.ok) {
      showArticleFormErrors(validation.errors);
      console.error("[admin] Validation failed:", validation.errors);
      return;
    }

    const articles = getArticlesData();

    if (payload.id) {
      // Mode édition
      updateArticle(payload.id, payload);
      console.log("[admin] article updated:", payload.id);
    } else {
      // Mode création
      createArticle(payload);
      console.log("[admin] article created");
    }

    // ADDED: Fermer le modal et re-render la liste après sauvegarde réussie
    closeArticleModal();
    renderAdminArticlesList();

    // ADDED: Mise à jour des compteurs admin
    updateAdminSiteCounters();

    console.log("[admin] article saved");

    // CHECKPOINT B: PREUVE (OBLIGATOIRE) : LOG LE BLOC OFFRE SAUVÉ
    const saved =
      getArticlesData().find((a) => a.id === payload.id) ||
      getArticlesData().find((a) => a.slug === payload.slug);
    const savedOffer = (saved?.contentBlocks || saved?.blocks || []).find(
      (b) =>
        (b.type || "").toLowerCase() === "offer" ||
        (b.type || "").toLowerCase() === "affiliation",
    );
    console.log("[PROOF savedOffer]", savedOffer);
  } catch (error) {
    console.error("[admin] Error saving article:", error);
    // Ne pas fermer le modal en cas d'erreur pour permettre la correction
  }
}

/**
 * ADDED: Édite un article
 */
function editArticle(articleId) {
  const articles = getArticlesData();
  const article = articles.find((a) => a.id === articleId);

  if (article) {
    openArticleModal("edit", article);
  }
}

/**
 * ADDED: Helper de normalisation string/array/null → string trim
 */
function toText(v) {
  if (Array.isArray(v)) {
    return v.join(", ").trim();
  }
  if (v == null) {
    return "";
  }
  return String(v).trim();
}

/**
 * ADDED: Vérifie si une source d'image peut être prévisualisée (safe, jamais throw)
 * @param {string} src - Source de l'image (URL ou dataURL)
 * @returns {boolean} - true si la source est prévisualisable
 */
function isImageSrcPreviewable(src) {
  try {
    if (!src || typeof src !== "string") return false;
    const s = src.trim();
    if (!s) return false;
    if (s.startsWith("http://") || s.startsWith("https://")) return true;
    if (s.startsWith("data:image/")) return true;
    if (s.startsWith("blob:")) return true;
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * ADDED: Estime la taille approximative d'une dataURL en bytes (safe, jamais throw)
 * @param {string} dataUrl - DataURL à analyser
 * @returns {number} - Taille estimée en bytes (0 si invalide)
 */
function estimateDataUrlSize(dataUrl) {
  try {
    if (!dataUrl || typeof dataUrl !== "string") return 0;
    if (!dataUrl.startsWith("data:image/")) return 0;

    // Trouver le préfixe (ex: "data:image/jpeg;base64,")
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex === -1) return 0;

    const prefixLength = commaIndex + 1;
    const base64Length = dataUrl.length - prefixLength;

    // Approximation: base64 utilise ~4 caractères pour 3 bytes
    const approxBytes = Math.ceil((base64Length * 3) / 4);
    return approxBytes;
  } catch (e) {
    return 0;
  }
}

/**
 * ADDED: Compresse une image via canvas (safe, jamais throw)
 * @param {string} dataUrl - DataURL source
 * @param {number} maxWidth - Largeur maximale (défaut: 1280)
 * @param {number} quality - Qualité JPEG (défaut: 0.82)
 * @returns {Promise<string>} - DataURL compressée ou originale en cas d'erreur
 */
function compressImageDataUrl(dataUrl, maxWidth = 1280, quality = 0.82) {
  return new Promise((resolve) => {
    try {
      if (
        !dataUrl ||
        typeof dataUrl !== "string" ||
        !dataUrl.startsWith("data:image/")
      ) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onload = function () {
        try {
          // Calculer les nouvelles dimensions en conservant le ratio
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          // Créer un canvas et redessiner l'image
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Exporter en JPEG avec qualité
          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve(compressed);
        } catch (e) {
          // En cas d'erreur, retourner l'original
          resolve(dataUrl);
        }
      };

      img.onerror = function () {
        resolve(dataUrl);
      };

      img.src = dataUrl;
    } catch (e) {
      resolve(dataUrl);
    }
  });
}

/**
 * ADDED: Génère un slug à partir d'une chaîne (safe, jamais throw)
 * @param {string} value - Chaîne à slugifier
 * @returns {string} - Slug ASCII minuscule
 */
function slugify(value) {
  try {
    if (!value || typeof value !== "string") return "";

    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Retire les accents
      .replace(/[^a-z0-9]/g, "-") // Tout non [a-z0-9] => '-'
      .replace(/-+/g, "-") // Collapse des '-' multiples
      .replace(/^-+|-+$/g, ""); // Trim '-' en début/fin
  } catch (e) {
    return "";
  }
}

/**
 * ADDED: Normalise une catégorie pour le filtrage robuste (lowercase + remove accents + trim)
 */
/**
 * ADDED: Normalise une catégorie pour le filtrage robuste (lowercase + remove accents + trim + espaces multiples)
 */
function normalizeCategory(category) {
  if (!category || typeof category !== "string") return "";
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Retire les accents
    .toLowerCase()
    .replace(/\s+/g, " ") // Remplace multiples espaces par un seul
    .trim();
}

/**
 * ADDED: Détecte la catégorie attendue depuis le pathname de la page
 */
function getExpectedCategoryForPage() {
  const pathname = window.location.pathname.toLowerCase();

  if (pathname.includes("actu.html")) {
    return "actu";
  } else if (pathname.includes("tests.html")) {
    return "test";
  } else if (pathname.includes("guides.html")) {
    return "guide";
  } else if (pathname.includes("bons-plans.html")) {
    return "bon plan";
  }

  return null;
}

/**
 * ADDED: Rend une liste d'articles standardisée (réutilisable pour toutes les pages de catégories)
 */
function renderArticlesListingPage(options = {}) {
  const {
    containerSelector = "#articlesGrid",
    categoryKey,
    pageTitle,
    pageSubtitle,
    emptyTitle,
    emptyText,
  } = options;

  // ADDED: Trouver le conteneur
  const container =
    typeof containerSelector === "string"
      ? document.querySelector(containerSelector) ||
        document.getElementById(containerSelector.replace("#", ""))
      : containerSelector;

  if (!container) return;

  // Wrapper premium pour la grille
  ensurePremiumPanel(container, {
    title: pageTitle,
    subtitle: pageSubtitle,
  });

  const articles = getArticlesData();

  // ADDED: Filtrer par catégorie si categoryKey fourni
  let filteredArticles = articles;
  if (categoryKey) {
    // ADDED: Mapping des catégories avec variations tolérées
    const categoryMapping = {
      actu: ["actu", "actualite", "actualites", "actualité", "actualités"],
      test: ["test", "tests"],
      guide: ["guide", "guides"],
      "bon plan": ["bon plan", "bons plans", "bons-plans", "bon-plan"],
    };

    const expectedCategories = categoryMapping[categoryKey] || [categoryKey];
    const normalizedExpected = expectedCategories.map((c) =>
      normalizeCategory(c),
    );

    filteredArticles = articles.filter((article) => {
      const articleCategory = normalizeCategory(article.category || "");
      return normalizedExpected.includes(articleCategory);
    });
  }

  // ADDED: Trier par date (desc) ou id (desc) si pas de date
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    const dateA = a.updatedAt || a.createdAt || "";
    const dateB = b.updatedAt || b.createdAt || "";
    if (dateA && dateB) {
      return dateB.localeCompare(dateA);
    }
    // Fallback sur id si pas de date
    const idA = a.id || "";
    const idB = b.id || "";
    return idB.localeCompare(idA);
  });

  // ADDED: Si aucun article, afficher état vide premium
  if (sortedArticles.length === 0) {
    container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: var(--spacing-3xl); max-width: 600px; margin: 0 auto;">
                <h2 style="font-size: 2em; margin-bottom: var(--spacing-md); color: var(--color-text-primary);">${emptyTitle || "Aucun article"}</h2>
                <p style="font-size: 1.125em; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); line-height: 1.6;">${emptyText || "Aucun article disponible pour le moment."}</p>
                <a href="index.html" class="btn btn-primary">Retour à l'accueil</a>
            </div>
        `;
    return;
  }

  // Fonction pour rendre un article individuel
  function renderArticleItem(article) {
    // ADDED: Utiliser getArticleUrl() pour construire l'URL
    const href = getArticleUrl(article);
    const title = article.title || "Sans titre";
    const excerpt = article.excerpt || "";

    // ADDED: Gérer l'image (cover ou placeholder)
    let imageHtml = "";
    if (
      article.cover &&
      article.cover.trim() &&
      (article.cover.startsWith("http://") ||
        article.cover.startsWith("https://"))
    ) {
      imageHtml = `<div class="article-image" style="background-image: url('${escapeHtml(article.cover)}'); background-size: cover; background-position: center;"></div>`;
    } else {
      imageHtml = `<div class="article-image placeholder-image"></div>`;
    }

    return `
            <article class="article-card">
                <a href="${href}">
                    ${imageHtml}
                    <div class="article-content">
                        <h3>${escapeHtml(title)}</h3>
                        <p>${escapeHtml(excerpt)}</p>
                    </div>
                </a>
            </article>
        `;
  }

  // ADDED: Utiliser la pagination pour les articles
  const pagerEl = document.createElement("div");
  pagerEl.className = "pagination";
  container.parentNode.insertBefore(pagerEl, container.nextSibling);

  initGridPagination({
    gridEl: container,
    pagerEl: pagerEl,
    items: sortedArticles,
    pageSize: 12,
    renderItem: renderArticleItem,
    key: "articles",
  });
}

/**
 * ADDED: Initialise une page de section d'articles avec filtres (console/genre/recherche/tri)
 * @param {Object} options - Options de configuration
 * @param {string} options.type - Type de page: 'actu' | 'test' | 'guide' | 'bons-plans'
 */
function initSectionArticlesPage(options = {}) {
  const { type } = options;
  if (!type) return;

  const container = document.getElementById("articlesGrid");
  if (!container) return;

  // Mapping des catégories
  const categoryMapping = {
    actu: ["actu", "actualite", "actualites", "actualité", "actualités"],
    test: ["test", "tests"],
    guide: ["guide", "guides"],
    "bons-plans": ["bon plan", "bons plans", "bons-plans", "bon-plan"],
  };

  const expectedCategories = categoryMapping[type] || [type];
  const normalizedExpected = expectedCategories.map((c) =>
    normalizeCategory(c),
  );

  // Mapping console (chip value -> plateformes possibles)
  const consoleMapping = {
    ps5: ["ps5", "playstation 5", "playstation5", "ps 5"],
    xbox: ["xbox", "xbox series x", "xbox series s", "xbox one"],
    switch: ["switch", "nintendo switch"],
    pc: ["pc", "windows", "steam"],
  };

  // Mapping genre (chip value -> genres possibles)
  const genreMapping = {
    rpg: ["rpg", "role-playing", "role playing"],
    action: ["action"],
    fps: ["fps", "first-person shooter", "first person shooter"],
    aventure: ["aventure", "adventure"],
    survival: ["survival"],
    inde: ["inde", "indé", "indie", "indépendant", "independant"],
  };

  // État des filtres (seulement console et genre)
  let selectedConsoles = [];
  let selectedGenres = [];

  // Fonction pour obtenir le jeu lié à un article
  function getLinkedGame(article) {
    if (!article.linkedGameId && !article.relatedGameId) return null;
    const games = getGamesData();
    const gameId = article.linkedGameId || article.relatedGameId;
    return games.find((g) => String(g.id) === String(gameId)) || null;
  }

  // Fonction pour normaliser une plateforme/genre pour matching
  function normalizeForMatch(str) {
    return (str || "").toLowerCase().trim().replace(/\s+/g, " ");
  }

  // Fonction de filtrage
  function filterArticles(articles) {
    return articles.filter((article) => {
      // Filtre par catégorie
      const articleCategory = normalizeCategory(article.category || "");
      if (!normalizedExpected.includes(articleCategory)) {
        return false;
      }

      // Filtre par console/genre via jeu lié
      // Si aucun filtre console/genre, on accepte tous les articles (y compris ceux sans jeu lié)
      if (selectedConsoles.length === 0 && selectedGenres.length === 0) {
        return true;
      }

      const linkedGame = getLinkedGame(article);

      // Si l'article n'a pas de jeu lié, on l'exclut SEULEMENT si des filtres console/genre sont actifs
      if (!linkedGame) {
        return false;
      }

      // Vérifier console
      let consoleMatch = selectedConsoles.length === 0;
      if (selectedConsoles.length > 0 && linkedGame.platforms) {
        const gamePlatforms = linkedGame.platforms.map((p) =>
          normalizeForMatch(p),
        );
        consoleMatch = selectedConsoles.some((selectedChip) => {
          const possibleMatches = consoleMapping[selectedChip] || [
            selectedChip,
          ];
          return gamePlatforms.some((platform) =>
            possibleMatches.some(
              (match) =>
                normalizeForMatch(platform).includes(
                  normalizeForMatch(match),
                ) ||
                normalizeForMatch(match).includes(normalizeForMatch(platform)),
            ),
          );
        });
      }

      // Vérifier genre
      let genreMatch = selectedGenres.length === 0;
      if (selectedGenres.length > 0 && linkedGame.genres) {
        const gameGenres = linkedGame.genres.map((g) => normalizeForMatch(g));
        genreMatch = selectedGenres.some((selectedChip) => {
          const possibleMatches = genreMapping[selectedChip] || [selectedChip];
          return gameGenres.some((genre) =>
            possibleMatches.some(
              (match) =>
                normalizeForMatch(genre).includes(normalizeForMatch(match)) ||
                normalizeForMatch(match).includes(normalizeForMatch(genre)),
            ),
          );
        });
      }

      return consoleMatch && genreMatch;
    });
  }

  // Fonction de rendu
  function render() {
    const allArticles = getArticlesData();
    let filtered = filterArticles(allArticles);

    if (filtered.length === 0) {
      container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: var(--spacing-3xl); max-width: 600px; margin: 0 auto;">
                    <h2 style="font-size: 2em; margin-bottom: var(--spacing-md); color: var(--color-text-primary);">Aucun article trouvé</h2>
                    <p style="font-size: 1.125em; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); line-height: 1.6;">Aucun article ne correspond à vos critères de recherche.</p>
                    <button class="chip chip-reset" id="articles-reset-filters" type="button">Réinitialiser les filtres</button>
                </div>
            `;
      // Réattacher le listener reset si présent
      const resetBtn = document.getElementById("articles-reset-filters");
      if (resetBtn) {
        resetBtn.addEventListener("click", resetFilters);
      }
      return;
    }

    // Utiliser la pagination pour les articles
    const pagerEl = container.nextElementSibling;
    if (!pagerEl || !pagerEl.classList.contains("pagination")) {
      const newPagerEl = document.createElement("div");
      newPagerEl.className = "pagination";
      container.parentNode.insertBefore(newPagerEl, container.nextSibling);
    }

    // Fonction pour rendre un article individuel
    function renderArticleItem(article) {
      // Utiliser getArticleUrl() pour construire l'URL
      const href = getArticleUrl(article);
      const title = article.title || "Sans titre";
      const excerpt = article.excerpt || "";

      // Gérer l'image (cover ou placeholder)
      let imageHtml = "";
      if (
        article.cover &&
        article.cover.trim() &&
        (article.cover.startsWith("http://") ||
          article.cover.startsWith("https://"))
      ) {
        imageHtml = `<div class="article-image" style="background-image: url('${escapeHtml(article.cover)}'); background-size: cover; background-position: center;"></div>`;
      } else {
        imageHtml = `<div class="article-image placeholder-image"></div>`;
      }

      return `
                <article class="article-card">
                    <a href="${href}">
                        ${imageHtml}
                        <div class="article-content">
                            <h3>${escapeHtml(title)}</h3>
                            <p>${escapeHtml(excerpt)}</p>
                        </div>
                    </a>
                </article>
            `;
    }

    // Debug visuel
    if (window.DEBUG_GRID) {
      window.addGridDebug(
        container,
        "ARTICLES-articlesGrid",
        filtered.length,
        true,
      );
    }

    initGridPagination({
      gridEl: container,
      pagerEl: pagerEl || container.nextElementSibling,
      items: filtered,
      pageSize: 12,
      renderItem: renderArticleItem,
      key: "articles",
    });

    // #region agent log
    // Instrumentation pour vérifier les styles calculés de la grille et des cards
    setTimeout(() => {
      const gridEl =
        document.getElementById("articlesGrid") ||
        document.querySelector(".articles-grid");
      const firstCard = gridEl?.querySelector(".article-card");
      if (gridEl && firstCard) {
        const gridStyles = window.getComputedStyle(gridEl);
        const cardStyles = window.getComputedStyle(firstCard);
      }
    }, 100);
    // #endregion
  }

  // Fonction de réinitialisation (seulement les chips)
  function resetFilters() {
    selectedConsoles = [];
    selectedGenres = [];

    // Mettre à jour l'UI - désactiver toutes les chips
    document.querySelectorAll(".chip[data-filter]").forEach((chip) => {
      chip.classList.remove("active");
    });

    render();
  }

  // Event listeners
  document.querySelectorAll(".chip[data-filter]").forEach((chip) => {
    chip.addEventListener("click", function () {
      const filterType = this.getAttribute("data-filter");
      const filterValue = this.getAttribute("data-value").toLowerCase();

      this.classList.toggle("active");

      if (filterType === "console") {
        if (this.classList.contains("active")) {
          if (!selectedConsoles.includes(filterValue)) {
            selectedConsoles.push(filterValue);
          }
        } else {
          selectedConsoles = selectedConsoles.filter((c) => c !== filterValue);
        }
      } else if (filterType === "genre") {
        if (this.classList.contains("active")) {
          if (!selectedGenres.includes(filterValue)) {
            selectedGenres.push(filterValue);
          }
        } else {
          selectedGenres = selectedGenres.filter((g) => g !== filterValue);
        }
      }

      render();
    });
  });

  // Pas de boutons reset ou toggle sur les pages simplifiées

  // Rendu initial
  render();
}

/**
 * ADDED: Slugify robuste pour les titres d'articles (spécifications strictes)
 */
function slugifyTitle(title) {
  if (!title || typeof title !== "string") return "article";

  return (
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Retire les accents
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-") // Remplace tout ce qui n'est pas [a-z0-9] par "-"
      .replace(/-+/g, "-") // Collapse des "-" multiples
      .replace(/^-+|-+$/g, "") || // Trim des "-" début/fin
    "article"
  ); // Fallback si vide
}

/**
 * ADDED: Garantit l'unicité d'un slug (safe, jamais throw)
 * @param {Array} articles - Liste des articles
 * @param {string} desiredSlug - Slug désiré (peut être vide)
 * @param {string} currentId - ID de l'article actuel (pour exclure du conflit)
 * @returns {string} - Slug unique
 */
function ensureUniqueSlug(articles, desiredSlug, currentId) {
  try {
    const base = slugify(desiredSlug || "");
    if (!base) return "";

    if (!Array.isArray(articles)) return base;

    // Vérifier conflits : conflit si a.slug === candidate ET a.id !== currentId
    let candidate = base;
    let counter = 2;

    while (
      articles.some((a) => {
        const articleSlug = toText(a.slug || "");
        return articleSlug === candidate && a.id !== currentId;
      })
    ) {
      candidate = `${base}-${counter}`;
      counter++;
    }

    return candidate;
  } catch (e) {
    return slugify(desiredSlug || "");
  }
}

/**
 * ADDED: Retourne l'URL d'un article (slug en priorité, sinon id)
 * @param {Object} article - Article
 * @returns {string} - URL de l'article
 */
function getArticleUrl(article) {
  if (!article) return "article.html";

  try {
    const slug = toText(article.slug || "");
    if (slug) {
      return `article.html?slug=${encodeURIComponent(slug)}`;
    }

    const id = toText(article.id || "");
    if (id) {
      return `article.html?id=${encodeURIComponent(id)}`;
    }

    return "article.html";
  } catch (e) {
    return "article.html";
  }
}

/**
 * ADDED: Récupère un article par son slug
 * @param {string} slug - Slug de l'article
 * @returns {Object|null} - Article ou null si non trouvé
 */
function getArticleBySlug(slug) {
  if (!slug || typeof slug !== "string") return null;

  try {
    const normalizedSlug = slugify(slug);
    if (!normalizedSlug) return null;

    const articles = getArticlesData();
    return (
      articles.find((a) => {
        const articleSlug = toText(a.slug || "");
        return articleSlug === normalizedSlug;
      }) || null
    );
  } catch (e) {
    return null;
  }
}

/**
 * ADDED: Hydrate les articles avec des slugs si absents (en mémoire uniquement, ne modifie pas data.js)
 */
function hydrateArticleSlugs(articles) {
  if (!Array.isArray(articles)) return articles;

  // Créer un Set des slugs existants
  const takenSlugs = new Set();
  articles.forEach((article) => {
    if (
      article.slug &&
      typeof article.slug === "string" &&
      article.slug.trim()
    ) {
      takenSlugs.add(article.slug.trim());
    }
  });

  // Hydrater les articles sans slug
  articles.forEach((article) => {
    if (!article.slug || !article.slug.trim()) {
      const baseSlug = slugifyTitle(article.title || "article");
      article.slug = ensureUniqueSlug(baseSlug, takenSlugs);
      takenSlugs.add(article.slug); // Ajouter au Set pour éviter les collisions
    }
  });

  return articles;
}

/**
 * Génère un ID unique pour un jeu
 */
function generateId(games, baseSlug) {
  if (!baseSlug) return "";

  let id = baseSlug;
  let counter = 1;

  while (games.some((g) => g.id === id)) {
    id = `${baseSlug}-${counter}`;
    counter++;
  }

  return id;
}

/**
 * ADDED: Valide les données d'un jeu (version durcie avec toText)
 */
function validateGame(payload) {
  const errors = {};

  // ADDED: Title obligatoire, min 2 caractères (utilise toText)
  const title = toText(payload.title);
  if (!title) {
    errors.title = "Le titre est obligatoire";
  } else if (title.length < 2) {
    errors.title = "Le titre doit contenir au moins 2 caractères";
  }

  // ADDED: Platforms obligatoires (utilise toText)
  const platformsStr = toText(payload.platforms);
  if (!platformsStr) {
    errors.platforms = "Les plateformes sont obligatoires";
  }

  // ADDED: Genres obligatoires (utilise toText)
  const genresStr = toText(payload.genres);
  if (!genresStr) {
    errors.genres = "Les genres sont obligatoires";
  }

  // Status doit être valide si présent
  if (
    payload.status &&
    !["released", "early-access", "upcoming"].includes(payload.status)
  ) {
    errors.status = "Statut invalide";
  }

  // ADDED: Cover URL validation simple si fourni (utilise toText)
  const cover = toText(payload.cover);
  if (cover) {
    const urlPattern = /^https?:\/\//i;
    if (!urlPattern.test(cover)) {
      errors.cover = "L'URL doit commencer par http:// ou https://";
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * ADDED: Ouvre le modal en mode création ou édition (version durcie)
 */
function openGameModal(mode, game = null) {
  const modal = document.getElementById("gameModal");
  const title = document.getElementById("modalTitle");
  const form = document.getElementById("gameForm");

  if (!modal || !title || !form) return;

  // Réinitialiser les erreurs
  clearFormErrors();

  if (mode === "create") {
    title.textContent = "Ajouter un jeu";
    form.reset();
    document.getElementById("game-id").value = "";
    // ADDED: S'assurer que checkbox est décochée
    document.getElementById("game-isFeatured").checked = false;
    // ADDED: Réinitialiser le preview de l'image cover
    updateCoverPreview("");
  } else if (mode === "edit" && game) {
    title.textContent = "Modifier un jeu";
    fillForm(game);
  }

  // ADDED: Afficher les médias récents sous le champ cover
  renderRecentMedia("game");

  modal.classList.add("is-open");
}

/**
 * ADDED: Ferme le modal (version durcie avec reset)
 */
function closeGameModal() {
  const modal = document.getElementById("gameModal");
  if (modal) {
    modal.classList.remove("is-open");
    clearFormErrors();
    // ADDED: Reset du formulaire à la fermeture
    const form = document.getElementById("gameForm");
    if (form) {
      form.reset();
    }
    // ADDED: Reset propre du preview cover
    const previewImg = document.getElementById("coverPreviewImg");
    const previewPlaceholder = document.getElementById(
      "coverPreviewPlaceholder",
    );
    const coverError = document.getElementById("error-cover");
    if (previewImg) {
      previewImg.style.display = "none";
      previewImg.src = "";
    }
    if (previewPlaceholder) {
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Aperçu indisponible";
    }
    if (coverError) {
      coverError.textContent = "";
    }
  }
}

/**
 * ADDED: Remplit le formulaire avec les données d'un jeu (version robuste avec toText)
 */
function fillForm(game) {
  document.getElementById("game-id").value = game.id || "";
  document.getElementById("game-title").value = toText(game.title);
  document.getElementById("game-platforms").value = Array.isArray(
    game.platforms,
  )
    ? game.platforms.join(", ")
    : toText(game.platforms);
  document.getElementById("game-genres").value = Array.isArray(game.genres)
    ? game.genres.join(", ")
    : toText(game.genres);
  document.getElementById("game-status").value = game.status || "released";
  document.getElementById("game-releaseDate").value = toText(
    game.releaseDate || game.release || game.year || "",
  );
  const coverValue = toText(game.cover || game.image || "");
  document.getElementById("game-cover").value = coverValue;
  document.getElementById("game-excerpt").value = toText(
    game.excerpt || game.shortDesc || game.subtitle || "",
  );
  document.getElementById("game-content").value = toText(
    game.content || game.description || "",
  );
  document.getElementById("game-isFeatured").checked = game.isFeatured || false;

  // ADDED: Remplir les nouveaux champs
  document.getElementById("game-studio").value = toText(game.studio || "");
  document.getElementById("game-modes").value = Array.isArray(game.modes)
    ? game.modes.join(", ")
    : toText(game.modes || "");
  document.getElementById("game-difficulty").value = toText(
    game.difficulty || "",
  );
  document.getElementById("game-duration").value = toText(game.duration || "");

  // ADDED: Mettre à jour le preview de l'image cover
  updateCoverPreview(coverValue);
}

/**
 * ADDED: Lit les données du formulaire (version robuste avec toText)
 */
function readForm() {
  const id = toText(document.getElementById("game-id").value);
  const title = toText(document.getElementById("game-title").value);
  const platformsStr = toText(document.getElementById("game-platforms").value);
  const genresStr = toText(document.getElementById("game-genres").value);
  const status = document.getElementById("game-status").value;
  const releaseDate = toText(document.getElementById("game-releaseDate").value);
  const cover = toText(document.getElementById("game-cover").value);
  const excerpt = toText(document.getElementById("game-excerpt").value);
  const content = toText(document.getElementById("game-content").value);
  const isFeatured = document.getElementById("game-isFeatured").checked;

  // ADDED: Lire les nouveaux champs
  const studio = toText(document.getElementById("game-studio").value);
  const modesStr = toText(document.getElementById("game-modes").value);
  const difficulty = toText(document.getElementById("game-difficulty").value);
  const duration = toText(document.getElementById("game-duration").value);

  // ADDED: Parser les plateformes, genres et modes (séparés par virgules)
  const platforms = platformsStr
    ? platformsStr
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p)
    : [];
  const genres = genresStr
    ? genresStr
        .split(",")
        .map((g) => g.trim())
        .filter((g) => g)
    : [];
  const modes = modesStr
    ? modesStr
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m)
    : [];

  return {
    id,
    title,
    platforms,
    genres,
    status,
    releaseDate,
    cover,
    image: cover, // ADDED: Mapper cover vers image pour les pages publiques
    excerpt,
    shortDesc: excerpt, // ADDED: Alias pour cohérence
    content,
    studio: studio || undefined, // ADDED: Ne pas inclure si vide
    modes: modes.length > 0 ? modes : undefined, // ADDED: Ne pas inclure si vide
    difficulty: difficulty || undefined, // ADDED: Ne pas inclure si vide
    duration: duration || undefined, // ADDED: Ne pas inclure si vide
    isFeatured,
  };
}

/**
 * ADDED: Affiche les erreurs de validation dans le formulaire (version durcie)
 */
function showFormErrors(errors) {
  Object.keys(errors).forEach((field) => {
    const input = document.getElementById(`game-${field}`);
    const errorEl = document.getElementById(`error-${field}`);

    if (input) {
      input.classList.add("invalid", "is-invalid");
    }

    if (errorEl) {
      errorEl.textContent = errors[field];
    }
  });
}

/**
 * ADDED: Efface les erreurs de validation (version améliorée)
 */
function clearFormErrors() {
  document
    .querySelectorAll(
      ".form-group input, .form-group textarea, .form-group select",
    )
    .forEach((el) => {
      el.classList.remove("invalid", "is-invalid");
    });
  document.querySelectorAll(".form-error").forEach((el) => {
    el.textContent = "";
  });
}

/**
 * ADDED: Efface l'erreur d'un champ spécifique (appelé à la saisie)
 */
function clearFieldError(fieldName) {
  const input = document.getElementById(`game-${fieldName}`);
  const errorEl = document.getElementById(`error-${fieldName}`);

  if (input) {
    input.classList.remove("invalid", "is-invalid");
  }

  if (errorEl) {
    errorEl.textContent = "";
  }
}

// ============================================
// ADDED: GESTION ARTICLES (CRUD + UI)
// ============================================

/**
 * ADDED: Génère un ID unique pour un article (réutilise generateId)
 */
/**
 * ADDED: Génère un slug unique pour un article (garantit l'unicité)
 */
function generateUniqueSlug(articles, baseSlug, excludeId = null) {
  if (!baseSlug) return "";

  let slug = baseSlug;
  let counter = 1;

  // Vérifier l'unicité (exclure l'article courant si en édition)
  while (
    articles.some((a) => a.slug === slug && (!excludeId || a.id !== excludeId))
  ) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

function generateArticleId(articles, baseSlug) {
  return generateId(articles, baseSlug);
}

/**
 * ADDED: Normalise le payload article avant validation (unifie les données du bloc Offre)
 */
function normalizeArticlePayload(payload) {
  if (!payload) return;

  // Utilitaire: retourne le premier string non vide trim()
  function getStr(...vals) {
    for (const val of vals) {
      const str = (val || "").trim();
      if (str) return str;
    }
    return "";
  }

  // Récupérer la liste des blocs
  const blocks = payload.contentBlocks || payload.blocks || [];
  if (!Array.isArray(blocks)) return;

  // Trouver le bloc offer/affiliation
  const offerBlock = blocks.find(
    (block) =>
      block &&
      (block.type === "offer" ||
        block.type === "affiliation" ||
        block.type === "link" ||
        block.kind === "offer"),
  );

  if (!offerBlock) return; // Pas de bloc offer, rien à normaliser

  // Lire url, title, text depuis plusieurs emplacements possibles
  const url = getStr(
    offerBlock.url,
    offerBlock.link?.url,
    offerBlock.data?.url,
    payload.link?.url,
  );
  let title = getStr(
    offerBlock.title,
    offerBlock.link?.title,
    offerBlock.data?.title,
    payload.link?.title,
  );
  const text = getStr(
    offerBlock.text,
    offerBlock.link?.text,
    offerBlock.data?.text,
    payload.link?.text,
  );

  // Lire image depuis plusieurs emplacements possibles dans le bloc
  const offerImg = getStr(
    offerBlock.image,
    offerBlock.imageUrl,
    offerBlock.img,
    offerBlock.mediaUrl,
    offerBlock.data?.imageUrl,
    offerBlock.data?.image,
    offerBlock.link?.imageUrl,
    offerBlock.link?.image,
    offerBlock.link?.cover,
  );

  // Si title vide mais text rempli => title = text
  if (!title && text) {
    title = text;
  }

  // Écrire les valeurs normalisées dans le bloc
  offerBlock.url = url;
  offerBlock.title = title;
  offerBlock.text = text;
  offerBlock.imageUrl = offerImg; // Normaliser l'image dans le bloc

  // Si block.link existe, mettre aussi block.link.url/title/text/image
  if (offerBlock.link) {
    offerBlock.link.url = url;
    offerBlock.link.title = title;
    offerBlock.link.text = text;
    offerBlock.link.imageUrl = offerImg;
    offerBlock.link.image = offerImg;
  }

  // Si block.data existe, mettre aussi block.data.url/title/text/image
  if (offerBlock.data) {
    offerBlock.data.url = url;
    offerBlock.data.title = title;
    offerBlock.data.text = text;
    offerBlock.data.imageUrl = offerImg;
    offerBlock.data.image = offerImg;
  }

  // Set payload.link = { ...(payload.link||{}), type:'affiliation', url, title, text, imageUrl, image }
  payload.link = {
    ...(payload.link || {}),
    type: "affiliation",
    url: url,
    title: title,
    text: text,
    imageUrl: offerImg,
    image: offerImg,
  };
}

/**
 * ADDED: Valide les données d'un article
 */
function validateArticle(payload) {
  const errors = {};

  const title = toText(payload.title);
  if (!title) {
    errors["article-title"] = "Le titre est obligatoire";
  }

  const category = toText(payload.category);
  const validCategories = ["actu", "guide", "bons-plans"];
  if (!category) {
    errors["article-category"] = "La catégorie est obligatoire";
  } else if (category === "test") {
    errors["article-category"] =
      "La catégorie Tests n'est plus disponible. Utilise la section Tests dédiée.";
  } else if (!validCategories.includes(category)) {
    errors["article-category"] = "Catégorie invalide";
  }

  const cover = toText(payload.cover);
  if (cover) {
    const urlPattern = /^https?:\/\//i;
    if (!urlPattern.test(cover)) {
      // Warning non bloquant
      errors["article-cover"] = "L'URL doit commencer par http:// ou https://";
    }
  }

  // REMOVED: Validation du link legacy supprimée (on ne rend plus article.link)

  // ADDED: Validation des blocs (support contentBlocks et blocks pour compatibilité)
  const contentBlocks = payload.contentBlocks || payload.blocks;
  if (contentBlocks && Array.isArray(contentBlocks)) {
    contentBlocks.forEach((block, index) => {
      if (block.type === "text" || block.type === "heading") {
        const text = toText(block.text);
        if (!text) {
          errors[`block-${index}`] =
            `Le bloc ${block.type === "text" ? "texte" : "titre"} ne peut pas être vide`;
        }
      } else if (block.type === "image") {
        // ADDED: L'image est optionnelle - on valide seulement si une URL est fournie
        const url = toText(block.url);
        if (url) {
          // ADDED: Accepter http://, https://, data:image/ et blob:
          const isValidUrl =
            url.startsWith("http://") ||
            url.startsWith("https://") ||
            url.startsWith("data:image/") ||
            url.startsWith("blob:");
          if (!isValidUrl) {
            errors[`block-${index}`] =
              "L'URL doit commencer par http(s):// ou être une image en data:image/...";
          }
        }
        // Si l'URL est vide, on ignore le bloc (pas d'erreur)
      } else if (block.type === "offer") {
        // ADDED: Validation du bloc offer - URL obligatoire + (title OU text) obligatoire
        // IMPORTANT: block.url (pas article.link - affiliation globale)
        // Lecture robuste depuis plusieurs emplacements possibles
        const url = toText(
          block.url || block.data?.url || block.link?.url || "",
        );
        const title = toText(
          block.title || block.data?.title || block.link?.title || "",
        );
        const text = toText(
          block.text || block.data?.text || block.link?.text || "",
        );

        const vUrl = (url || "").trim();
        const vTitle = (title || "").trim();
        const vText = (text || "").trim();

        // URL obligatoire + (Titre OU Texte) obligatoire
        if (!vUrl || (!vTitle && !vText)) {
          errors[`block-${index}`] =
            "URL et titre/texte de l'offre obligatoires";
        } else {
          // BONUS: si title vide mais text rempli, copier text dans title avant la sauvegarde
          if (!vTitle && vText) {
            block.title = vText;
          }
          // Vérifier que l'URL est valide
          try {
            new URL(vUrl);
          } catch (e) {
            errors[`block-${index}`] = "L'URL de l'offre n'est pas valide";
          }
        }
      } else if (block.type === "youtube") {
        const url = toText(block.url || "");
        if (!url || !url.trim()) {
          errors[`block-${index}`] = "URL YouTube requise";
        } else {
          try {
            new URL(url);
          } catch (e) {
            errors[`block-${index}`] = "L'URL YouTube n'est pas valide";
          }
        }
      } else if (block.type === "twitter") {
        const url = toText(block.url || "");
        if (!url || !url.trim()) {
          errors[`block-${index}`] = "URL du post X requise";
        } else {
          // Validation URL X/Twitter (x.com ou twitter.com avec /status/ID)
          function isTweetUrl(urlStr) {
            try {
              const u = new URL(urlStr.trim());
              const hostOk =
                /(^|\.)x\.com$/.test(u.hostname) ||
                /(^|\.)twitter\.com$/.test(u.hostname);
              if (!hostOk) return false;
              // format: /{user}/status/{id}
              return /\/status\/\d+/.test(u.pathname);
            } catch (e) {
              return false;
            }
          }

          if (!isTweetUrl(url)) {
            errors[`block-${index}`] =
              "URL du post X invalide (x.com/.../status/123)";
          }
        }
      }
    });
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * ADDED: Remplit le formulaire article avec les données
 */
function fillArticleForm(article) {
  document.getElementById("article-id").value = article.id || "";
  document.getElementById("article-title").value = toText(article.title);

  // Gestion spéciale pour les articles avec category = "test" (migration douce)
  let category = article.category || "";
  if (category === "test") {
    category = "actu"; // Forcer vers "actu"
    // Afficher un warning (optionnel, on pourrait ajouter une notification)
    console.warn(
      `[admin] Article "${article.title}" a une catégorie obsolète "test", forcée vers "actu".`,
    );
  }
  document.getElementById("article-category").value = category;

  document.getElementById("article-relatedGameId").value =
    article.relatedGameId || "";
  document.getElementById("article-cover").value = toText(article.cover);
  document.getElementById("article-excerpt").value = toText(article.excerpt);
  document.getElementById("article-content").value = toText(article.content);

  // ADDED: Remplir le champ slug avec article.slug si présent, sinon vide (NE PAS auto-générer)
  const slugField = document.getElementById("article-slug");
  if (slugField) {
    slugField.value = toText(article.slug || "");
  }

  // ADDED: Remplir les champs auteur et date de publication
  const authorIdField = document.getElementById("article-authorId");
  const authorNameField = document.getElementById("article-authorName");
  const publishedAtField = document.getElementById("article-publishedAt");

  // Migration douce : si article a authorId, utiliser authorId, sinon essayer de mapper depuis author/authorName
  if (authorIdField) {
    if (article.authorId) {
      authorIdField.value = article.authorId;
    } else if (article.author || article.authorName) {
      // Essayer de normaliser depuis le nom (texte) vers un ID auteur
      const authorName = toText(
        article.author || article.authorName || "",
      ).trim();
      if (authorName) {
        const normalizedId = normalizeAuthorId(authorName);
        if (normalizedId) {
          authorIdField.value = normalizedId;
        }
      }
    }
  }

  if (authorNameField) {
    // Remplir authorName depuis authorId si présent, sinon depuis author/authorName (nouvelle source d'auteurs)
    if (article.authorId) {
      const authors = getAuthors();
      const author = authors.find((a) => a.id === article.authorId);
      if (author) {
        authorNameField.value = author.name;
      } else {
        authorNameField.value = toText(
          article.author || article.authorName || "",
        );
      }
    } else {
      authorNameField.value = toText(
        article.author || article.authorName || "",
      );
    }
  }

  if (publishedAtField) {
    publishedAtField.value = toText(article.publishedAt || "");
  }

  // ADDED: Remplir les champs link (migration depuis formats anciens si nécessaire)
  const ctaTypeField = document.getElementById("article-cta-type");
  const ctaUrlField = document.getElementById("article-cta-url");
  const linkTitleField = document.getElementById("article-link-title");
  const linkTextField = document.getElementById("article-link-text");
  const linkButtonField = document.getElementById("article-link-button");
  const linkDiscountField = document.getElementById("article-link-discount");

  // Récupérer l'objet link (priorité: article.link > migration depuis formats anciens)
  let articleLink = article.link;

  // Migration depuis formats anciens si link n'existe pas
  if (!articleLink || !articleLink.type || articleLink.type === "none") {
    // Migration depuis linkType/linkUrl (format précédent)
    if (article.linkType && article.linkType !== "none") {
      articleLink = {
        type:
          article.linkType === "affiliate"
            ? "affiliation"
            : article.linkType === "link"
              ? "link"
              : article.linkType,
        url: article.linkUrl || "",
        title: article.linkTitle || "",
        text: article.linkText || "",
        buttonText: article.linkCta || article.linkButtonText || "",
        discount: article.linkDiscount || "",
      };
    }
    // Migration depuis link (ancien format objet)
    else if (
      article.link &&
      article.link.type &&
      article.link.type !== "none"
    ) {
      articleLink = {
        type:
          article.link.type === "affiliate"
            ? "affiliation"
            : article.link.type === "link" || article.link.type === "other"
              ? "link"
              : article.link.type,
        url: article.link.url || "",
        title: article.link.title || "",
        text: article.link.text || "",
        buttonText:
          article.link.buttonText ||
          article.link.button ||
          article.link.linkCta ||
          article.link.label ||
          "",
        discount: article.link.discount || "",
      };
    }
    // Migration depuis cta
    else if (article.cta && article.cta.type && article.cta.type !== "none") {
      articleLink = {
        type:
          article.cta.type === "affiliate"
            ? "affiliation"
            : article.cta.type === "link" || article.cta.type === "other"
              ? "link"
              : article.cta.type,
        url: article.cta.url || "",
        title: "",
        text: article.cta.label || "",
        buttonText: "",
        discount: "",
      };
    }
    // Migration depuis affiliateLink/affiliateUrl (ancien format)
    else if (article.affiliateUrl || article.affiliateLink) {
      articleLink = {
        type: "affiliation",
        url: article.affiliateUrl || article.affiliateLink || "",
        title: "",
        text: "",
        buttonText: "",
        discount: "",
      };
    }
  }

  // Normaliser la structure : utiliser buttonText
  if (articleLink && !articleLink.buttonText) {
    articleLink.buttonText = articleLink.button || articleLink.linkCta || "";
  }

  // Normaliser le type pour le select (affiliation -> affiliate)
  let selectType = "none";
  if (articleLink && articleLink.type && articleLink.type !== "none") {
    if (articleLink.type === "affiliation") {
      selectType = "affiliate";
    } else {
      selectType = articleLink.type;
    }
  }

  if (ctaTypeField) {
    ctaTypeField.value = selectType;
    // Déclencher le changement pour afficher/masquer les champs après un court délai
    setTimeout(() => {
      if (ctaTypeField.dispatchEvent) {
        ctaTypeField.dispatchEvent(new Event("change"));
      }
    }, 50);
  }
  if (ctaUrlField) {
    ctaUrlField.value = toText(articleLink?.url || "");
  }
  if (linkTitleField) {
    linkTitleField.value = toText(articleLink?.title || "");
  }
  if (linkTextField) {
    linkTextField.value = toText(articleLink?.text || "");
  }
  if (linkButtonField) {
    // Utiliser buttonText (structure standardisée)
    linkButtonField.value = toText(articleLink?.buttonText || "");
  }
  if (linkDiscountField) {
    linkDiscountField.value = toText(articleLink?.discount || "");
  }

  // ADDED: Cocher le checkbox "Mis en avant" si featured === true
  document.getElementById("article-featured").checked =
    article.featured === true;

  // ADDED: Mettre à jour le preview de l'image cover
  updateArticleCoverPreview(toText(article.cover));

  // ADDED: Charger les blocs si présents (support contentBlocks et blocks pour compatibilité)
  const contentBlocks = article.contentBlocks || article.blocks;
  if (
    contentBlocks &&
    Array.isArray(contentBlocks) &&
    contentBlocks.length > 0
  ) {
    // Ajouter blockId + normaliser src/url pour les blocs image
    const blocksWithId = contentBlocks.map((block, idx) => {
      const normalized = {
        ...block,
        blockId:
          block.blockId ||
          `block-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
      };
      // ADDED: Normaliser src/url pour les blocs image
      if (normalized.type === "image") {
        // Priorité: src > url
        if (!normalized.src && normalized.url) {
          normalized.src = normalized.url;
        }
        // REMOVED: Suppression de la logique display (fonctionnalité retirée)
        // Nettoyer display si présent
        if (normalized.display) {
          delete normalized.display;
        }
      }
      return normalized;
    });
    articleBlocks = blocksWithId;
    renderArticleBlocks(articleBlocks);
  } else {
    articleBlocks = [];
    renderArticleBlocks([]);
  }
}

/**
 * ADDED: Lit les données du formulaire article
 */
function readArticleForm() {
  const id = toText(document.getElementById("article-id").value);
  const title = toText(document.getElementById("article-title").value);
  const category = document.getElementById("article-category").value;
  const relatedGameId =
    document.getElementById("article-relatedGameId").value || "";
  const cover = toText(document.getElementById("article-cover").value);
  const excerpt = toText(document.getElementById("article-excerpt").value);
  const content = toText(document.getElementById("article-content").value);
  const featured = document.getElementById("article-featured").checked;

  // ADDED: Lire les champs auteur et date de publication
  const authorIdInput = document.getElementById("article-authorId");
  const authorNameInput = document.getElementById("article-authorName");
  const publishedAtInput = document.getElementById("article-publishedAt");

  const authorId = authorIdInput ? toText(authorIdInput.value).trim() : "";
  let authorName = "";

  // ADDED: Récupérer le nom depuis authorId si présent (utiliser getAuthors())
  if (authorId) {
    try {
      const author = getAuthorById(authorId);
      if (author) {
        authorName = author.name;
      }
    } catch (e) {
      // Fallback silencieux
    }
  }

  // Fallback sur authorName si pas trouvé depuis authorId
  if (!authorName && authorNameInput) {
    authorName = toText(authorNameInput.value).trim();
  }

  // Fallback final : si toujours pas de nom et qu'on a un authorId, essayer de normaliser
  if (!authorName && authorId) {
    // Ne rien faire, on garde authorId même sans nom
  }

  const publishedAt = publishedAtInput
    ? toText(publishedAtInput.value).trim()
    : "";

  // REMOVED: Section "Lien (optionnel)" supprimée - on ne lit plus payload.link depuis le formulaire
  // On garde payload.link existant si déjà présent dans l'article (legacy), mais on ne l'édite plus via l'UI
  const link = {
    type: "none",
    url: "",
    title: "",
    text: "",
    buttonText: "",
    discount: "",
  };

  // ADDED: Lire les blocs
  const blocks = readArticleBlocks();

  // ADDED: Si l'objet link est de type affiliation mais n'a pas d'image,
  // chercher dans les blocs offer pour récupérer l'image
  if (link.type === "affiliation" && (!link.image || !link.imageUrl)) {
    const offerBlock = blocks.find(
      (block) =>
        block &&
        (block.type === "offer" ||
          block.type === "affiliation" ||
          block.type === "link" ||
          block.kind === "offer"),
    );
    if (offerBlock) {
      const offerImg = (offerBlock.imageUrl || offerBlock.image || "").trim();
      if (offerImg) {
        link.imageUrl = offerImg;
        link.image = offerImg;
      }
    }
  }

  // ADDED: Générer slug UNIQUEMENT au SAVE admin (point clé)
  const slugInput = document.getElementById("article-slug");
  const slugInputValue = slugInput ? toText(slugInput.value).trim() : "";

  let slugFinal = "";
  const existingArticles = getArticlesData();

  // Récupérer title pour génération si slug vide
  const desired = slugInputValue || title || "";

  // IMPORTANT: Si article ancien n'a pas de slug, c'est ICI (au save) qu'il en obtient un
  if (desired) {
    slugFinal = ensureUniqueSlug(existingArticles, desired, id);
  }

  // Si article existant a déjà un slug et qu'on ne modifie pas le champ slug, le garder
  if (!slugInputValue && id) {
    const existingArticle = existingArticles.find((a) => a.id === id);
    if (
      existingArticle &&
      existingArticle.slug &&
      existingArticle.slug.trim()
    ) {
      slugFinal = existingArticle.slug;
    }
  }

  return {
    id,
    title,
    slug: slugFinal || "", // ADDED: Slug généré uniquement au save admin (string, peut être "" si title/slug vide)
    category,
    relatedGameId,
    cover,
    excerpt,
    content,
    featured: featured || false, // ADDED: Enregistrer featured (boolean)
    authorId: authorId || "", // ADDED: ID de l'auteur (stable)
    author: authorName || "", // ADDED: Auteur (utiliser 'author' au lieu de 'authorName' pour cohérence)
    authorName: authorName || "", // ADDED: Auteur (garder authorName pour compatibilité)
    publishedAt: publishedAt || "", // ADDED: Date de publication
    link: link, // ADDED: Objet link standardisé
    contentBlocks: blocks.length > 0 ? blocks : undefined, // Ne pas inclure si vide
  };
}

/**
 * ADDED: Variable globale pour stocker l'index du bloc image en cours d'édition (pour le picker média)
 */
let currentBlockImageIndex = null;

/**
 * ADDED: État unique pour les blocs d'article (builder)
 */
let articleBlocks = [];

/**
 * ADDED: Synchronise articleBlocks depuis le DOM (préserve les valeurs saisies)
 */
function syncArticleBlocksFromDOM() {
  const blocksList = document.getElementById("article-blocks-list");
  if (!blocksList) {
    return;
  }

  const blockElements = blocksList.querySelectorAll(".article-block-item");
  const syncedBlocks = [];

  blockElements.forEach((blockEl) => {
    const blockId = blockEl.dataset.blockId;
    const type = blockEl.dataset.blockType;

    // Trouver le bloc existant dans articleBlocks ou créer un nouveau
    let block = articleBlocks.find((b) => b.blockId === blockId) || {
      type,
      blockId:
        blockId ||
        `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    block.type = type;

    if (type === "text") {
      const textarea = blockEl.querySelector(
        'textarea[data-block-field="text"]',
      );
      if (textarea) block.text = toText(textarea.value);
    } else if (type === "heading") {
      const level = blockEl.querySelector('select[data-block-field="level"]');
      const textarea = blockEl.querySelector(
        'textarea[data-block-field="text"]',
      );
      if (level) {
        const levelValue = level.value || "h2";
        block.level = levelValue === "h3" ? 3 : 2;
      }
      if (textarea) block.text = toText(textarea.value);
    } else if (type === "image") {
      const url = blockEl.querySelector('input[data-block-field="url"]');
      const alt = blockEl.querySelector('input[data-block-field="alt"]');
      const caption = blockEl.querySelector(
        'input[data-block-field="caption"]',
      );

      // IMPORTANT: utiliser 'src' comme champ principal (compat avec rendu public)
      // IMPORTANT: Lire TOUJOURS depuis url.value (pas depuis la preview img)
      if (url) {
        const urlValue = toText(url.value);
        block.src = urlValue;
        block.url = urlValue; // Garder url pour compat
      } else {
        // Si input absent, nettoyer les valeurs
        block.src = "";
        block.url = "";
      }
      if (alt) block.alt = toText(alt.value);
      if (caption) block.caption = toText(caption.value);

      // REMOVED: Suppression de la logique display (fonctionnalité retirée)
      // Nettoyer display si présent (sans casser)
      if (block.display) {
        delete block.display;
      }
    } else if (type === "offer") {
      // ADDED: Synchroniser les champs du bloc offre via data-field explicites
      // IMPORTANT: Ne pas confondre avec article.link (affiliation globale)
      // Lire UNIQUEMENT via data-field avec ?.value?.trim() || ""
      const title = (
        blockEl.querySelector('[data-field="title"]')?.value || ""
      ).trim();
      const url = (
        blockEl.querySelector('[data-field="url"]')?.value || ""
      ).trim();

      // ÉTAPE 2: Récupérer imageUrl avec fallbacks multiples (robuste)
      const imgInput =
        blockEl.querySelector('input[data-field="imageUrl"]') ||
        blockEl.querySelector('input[placeholder*="URL de l\'image"]') ||
        blockEl.querySelector('input[name*="image"]') ||
        blockEl.querySelector('input[id*="image"]');

      const inputValue = (imgInput?.value || "").trim();
      const datasetValue = (blockEl.dataset.imageUrl || "").trim();
      const imageUrl = inputValue || datasetValue;

      // CHECKPOINT B: Log sérialisation imageUrl
      const promo = (
        blockEl.querySelector('[data-field="promo"]')?.value || ""
      ).trim();
      const strikePrice = (
        blockEl.querySelector('[data-field="strikePrice"]')?.value || ""
      ).trim();
      const price = (
        blockEl.querySelector('[data-field="price"]')?.value || ""
      ).trim();
      const buttonText = (
        blockEl.querySelector('[data-field="buttonText"]')?.value || ""
      ).trim();
      const note = (
        blockEl.querySelector('[data-field="note"]')?.value || ""
      ).trim();
      const newTab = !!blockEl.querySelector('[data-field="newTab"]')?.checked;

      // IMPORTANT: Toujours sauvegarder le bloc (même si title/url vides)
      // La validation se fera dans validateArticle()
      block.title = title;
      block.url = url; // IMPORTANT: block.url (pas article.link)
      block.imageUrl = imageUrl;
      block.image = imageUrl; // compat

      // Si block.data ou block.link existent, y mettre aussi imageUrl
      if (block.data) {
        block.data.imageUrl = imageUrl;
        block.data.image = imageUrl;
      }
      if (block.link) {
        block.link.imageUrl = imageUrl;
        block.link.image = imageUrl;
      }

      block.promo = promo;
      block.strikePrice = strikePrice;
      block.price = price;
      block.buttonText = buttonText;
      block.note = note;
      block.newTab = newTab;

      // Compatibilité: garder aussi les anciens noms pour le rendu public
      block.oldPrice = strikePrice; // pour compatibilité avec rendu public
      block.newPrice = price; // pour compatibilité avec rendu public
      block.promoText = promo; // pour compatibilité avec rendu public
      block.priceOld = strikePrice; // pour compatibilité avec rendu public
      block.priceNew = price; // pour compatibilité avec rendu public
      block.domain = note; // pour compatibilité avec rendu public
      block.domainNote = note; // pour compatibilité avec rendu public

      // CHECKPOINT B: Log avant push du bloc offer
    } else if (type === "youtube") {
      const urlInput = blockEl.querySelector('[data-field="url"]');
      const url = urlInput ? (urlInput.value || "").trim() : "";
      block.url = url;
    } else if (type === "twitter") {
      const urlInput = blockEl.querySelector('[data-field="url"]');
      const url = urlInput ? (urlInput.value || "").trim() : "";
      block.url = url;
    }

    syncedBlocks.push(block);
  });

  // CHECKPOINT B: Log après sync
  const offerBlock = syncedBlocks.find((b) => b.type === "offer");

  articleBlocks = syncedBlocks;
}

/**
 * ADDED: Lit les blocs depuis l'état articleBlocks (après synchronisation depuis le DOM)
 */
function readArticleBlocks() {
  // Synchroniser depuis le DOM pour capturer les dernières modifications
  syncArticleBlocksFromDOM();
  // Retourner une copie sans blockId pour la sauvegarde + nettoyer display si présent
  return articleBlocks.map((block) => {
    const { blockId, ...blockData } = block;
    // REMOVED: Suppression de la logique display (fonctionnalité retirée)
    // Nettoyer display et affichage si présents (sans casser)
    if (
      blockData.type === "image" ||
      blockData.type === "img" ||
      blockData.type === "media"
    ) {
      if (blockData.display) {
        delete blockData.display;
      }
      if (blockData.affichage) {
        delete blockData.affichage;
      }
    }
    return blockData;
  });
}

/**
 * ADDED: Affiche les blocs dans le builder (utilise articleBlocks comme source de vérité)
 */
function renderArticleBlocks(blocks) {
  // Mettre à jour l'état global
  articleBlocks = blocks || [];

  const blocksList = document.getElementById("article-blocks-list");
  if (!blocksList) return;

  blocksList.innerHTML = "";

  // Ajouter un blockId unique si absent
  articleBlocks.forEach((block, index) => {
    if (!block.blockId) {
      block.blockId = `block-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
    }
  });

  articleBlocks.forEach((block, index) => {
    const blockEl = createArticleBlockElement(block, index);
    blocksList.appendChild(blockEl);
  });
}

/**
 * ADDED: Crée un élément DOM pour un bloc
 */
function createArticleBlockElement(block, index) {
  const blockEl = document.createElement("div");
  blockEl.className = "article-block-item";
  blockEl.dataset.blockType = block.type;
  blockEl.dataset.blockIndex = index;
  blockEl.dataset.blockId =
    block.blockId ||
    `block-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
  blockEl.style.cssText =
    "background: rgba(31, 42, 68, 0.3); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--spacing-md);";

  let content = "";

  if (block.type === "text") {
    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc Texte</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <textarea data-block-field="text" rows="4" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); resize: vertical;" placeholder="Texte du paragraphe...">${escapeHtml(block.text || "")}</textarea>
        `;
  } else if (block.type === "heading") {
    // Convertir level (2/3 ou 'h2'/'h3') en valeur pour le select
    const levelNum =
      typeof block.level === "number"
        ? block.level
        : block.level === "h3"
          ? 3
          : 2;
    const levelValue = levelNum === 3 ? "h3" : "h2";
    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc Titre</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                <select data-block-field="level" style="padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
                    <option value="h2" ${levelValue === "h2" ? "selected" : ""}>H2</option>
                    <option value="h3" ${levelValue === "h3" ? "selected" : ""}>H3</option>
                </select>
                <textarea data-block-field="text" rows="2" style="flex: 1; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); resize: vertical;" placeholder="Texte du titre...">${escapeHtml(block.text || "")}</textarea>
            </div>
        `;
  } else if (block.type === "image") {
    // IMPORTANT: lire src en priorité, puis url pour compat
    const url = block.src || block.url || "";
    const alt = block.alt || "";
    const caption = block.caption || "";
    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc Image</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                <input type="text" data-block-field="url" value="${escapeHtml(url)}" placeholder="https://..." style="flex: 1; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
                <button type="button" class="btn btn-secondary" data-block-pick-media="${index}" style="white-space: nowrap; font-size: 0.875em;">Choisir dans Médias</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                <input type="text" data-block-field="alt" value="${escapeHtml(alt)}" placeholder="Texte alternatif (optionnel)" style="padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
                <input type="text" data-block-field="caption" value="${escapeHtml(caption)}" placeholder="Légende (optionnel)" style="padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
            </div>
            <div class="image-preview" data-block-preview="${index}" style="width: 100%; height: 120px; border-radius: var(--radius-sm); overflow: hidden; margin-top: var(--spacing-sm); background: rgba(31, 42, 68, 0.5); display: flex; align-items: center; justify-content: center;">
                ${isImageSrcPreviewable(url) ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt || "Preview")}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.parentElement.innerHTML='<div style=\\'color: var(--color-text-secondary); font-size: 0.75em;\\'>Erreur de chargement</div>'">` : '<div style="color: var(--color-text-secondary); font-size: 0.75em;">Aperçu indisponible</div>'}
            </div>
        `;
  } else if (block.type === "offer") {
    // ADDED: Bloc offre avec nouveaux noms (image, promo, oldPrice, newPrice, domain)
    // IMPORTANT: block.url (pas article.link)
    const title = block.title || "";
    const url = block.url || ""; // block.url du bloc offer, pas article.link
    // Compatibilité: lire image ou imageUrl
    const imageUrl = block.image || block.imageUrl || "";
    // Compatibilité: lire promo ou promoText
    const promoText = block.promo || block.promoText || "";
    // Compatibilité: lire oldPrice ou priceOld
    const priceOld = block.oldPrice || block.priceOld || "";
    // Compatibilité: lire newPrice ou priceNew
    const priceNew = block.newPrice || block.priceNew || "";
    const buttonText = block.buttonText || "Voir l'offre";
    // Compatibilité: lire domain ou domainNote
    const domainNote = block.domain || block.domainNote || "";
    const newTab = block.newTab !== false;

    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc Offre</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                <input type="text" data-field="title" value="${escapeHtml(title)}" placeholder="Titre de l'offre *" required style="padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
                <input type="url" data-field="url" value="${escapeHtml(url)}" placeholder="URL (affiliation) *" required style="padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
            </div>
            <div style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                <input type="url" data-field="imageUrl" value="${escapeHtml(imageUrl)}" placeholder="URL de l'image" style="flex: 1; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
                <button type="button" class="btn btn-secondary" data-block-pick-media-offer="${index}" style="white-space: nowrap; font-size: 0.875em;">Choisir dans Médias</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                <input type="text" data-field="promo" value="${escapeHtml(promoText)}" placeholder="Promo (-35%)" style="padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
                <input type="text" data-field="strikePrice" value="${escapeHtml(priceOld)}" placeholder="Prix barré (39,99€)" style="padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
                <input type="text" data-field="price" value="${escapeHtml(priceNew)}" placeholder="Prix promo (25,89€)" style="padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                <input type="text" data-field="buttonText" value="${escapeHtml(buttonText)}" placeholder="Texte du bouton" style="padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
                <input type="text" data-field="note" value="${escapeHtml(domainNote)}" placeholder="Note (domaine auto si vide)" style="padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary);">
            </div>
            <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
                <label style="display: flex; align-items: center; gap: var(--spacing-xs); color: var(--color-text-primary); font-size: 0.875em;">
                    <input type="checkbox" data-field="newTab" ${newTab ? "checked" : ""} style="cursor: pointer;">
                    Ouvrir dans un nouvel onglet
                </label>
            </div>
            <div class="image-preview" data-block-preview="${index}" style="width: 100%; height: 120px; border-radius: var(--radius-sm); overflow: hidden; margin-top: var(--spacing-sm); background: rgba(31, 42, 68, 0.5); display: flex; align-items: center; justify-content: center;">
                ${imageUrl && isImageSrcPreviewable(imageUrl) ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title || "Preview")}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.parentElement.innerHTML='<div style=\\'color: var(--color-text-secondary); font-size: 0.75em;\\'>Erreur de chargement</div>'">` : '<div style="color: var(--color-text-secondary); font-size: 0.75em;">Aperçu indisponible</div>'}
            </div>
        `;
  } else if (block.type === "youtube") {
    const url = block.url || "";
    const videoId = extractYouTubeId(url);
    const thumbUrl = getYouTubeThumb(videoId);
    const embedSrc = getYouTubeEmbedSrc(videoId);
    const isFileProtocol = window.location.protocol === "file:";

    // DEBUG: Log pour vérifier le src réel
    console.log(
      "[YT DEBUG ADMIN] rawUrl=",
      url,
      "id=",
      videoId,
      "embedSrc=",
      embedSrc,
      "isFileProtocol=",
      isFileProtocol,
    );

    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc YouTube</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <input type="url" data-field="url" value="${escapeHtml(url)}" placeholder="URL YouTube" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); margin-bottom: var(--spacing-sm);">
            <div class="youtube-preview" data-block-preview="${index}" style="width: 100%; aspect-ratio: 16/9; border-radius: var(--radius-sm); overflow: hidden; margin-top: var(--spacing-sm); background: rgba(31, 42, 68, 0.5); display: flex; align-items: center; justify-content: center; position: relative;">
                ${
                  videoId
                    ? isFileProtocol || !embedSrc
                      ? `
                    <div class="yt-fallback yt-preview" style="background-image: url('${escapeHtml(thumbUrl)}');" onclick="window.open('${escapeHtml(url)}', '_blank', 'noopener')">
                        <div class="yt-play-icon"></div>
                        <div class="yt-badge">YouTube</div>
                    </div>
                `
                      : `
                    <iframe src="${escapeHtml(embedSrc)}" title="YouTube video" frameborder="0" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width: 100%; height: 100%; z-index: 1;" data-yt-video-id="${escapeHtml(videoId)}" data-yt-original-url="${escapeHtml(url)}"></iframe>
                    <div class="yt-fallback yt-preview" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none; z-index: 2; background-image: url('${escapeHtml(thumbUrl)}');" onclick="window.open('${escapeHtml(url)}', '_blank', 'noopener')">
                        <div class="yt-play-icon"></div>
                        <div class="yt-badge">YouTube</div>
                    </div>
                `
                    : '<div style="color: var(--color-text-secondary); font-size: 0.75em; text-align: center; padding: var(--spacing-md);">URL YouTube invalide</div>'
                }
            </div>
        `;
  } else if (block.type === "twitter") {
    const url = block.url || "";

    content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="font-weight: var(--font-weight-medium); color: var(--color-text-primary);">Bloc X</span>
                <div style="display: flex; gap: var(--spacing-xs);">
                    <button type="button" class="btn btn-secondary" data-block-move="up" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" class="btn btn-secondary" data-block-move="down" data-block-index="${index}" style="font-size: 0.75em; padding: 4px 8px;">↓</button>
                    <button type="button" class="btn btn-cancel" data-block-remove="${index}" style="font-size: 0.75em; padding: 4px 8px;">Supprimer</button>
                </div>
            </div>
            <input type="url" data-field="url" value="${escapeHtml(url)}" placeholder="URL du post X (x.com/.../status/123)" style="width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: rgba(31, 42, 68, 0.5); color: var(--color-text-primary); margin-bottom: var(--spacing-sm);">
            <div class="twitter-preview" data-block-preview="${index}" style="width: 100%; margin-top: var(--spacing-sm); background: rgba(31, 42, 68, 0.5); border-radius: var(--radius-sm); padding: var(--spacing-md); min-height: 200px; display: flex; align-items: center; justify-content: center;">
                ${url ? `<blockquote class="twitter-tweet"><a href="${escapeHtml(url)}"></a></blockquote>` : '<div style="color: var(--color-text-secondary); font-size: 0.75em; text-align: center; padding: var(--spacing-md);">Aperçu indisponible</div>'}
            </div>
        `;
  }

  blockEl.innerHTML = content;

  // DEBUG: Vérifier le src réel dans le DOM après insertion (YouTube) + détection erreur
  if (block.type === "youtube" && block.url) {
    setTimeout(() => {
      const ifr = blockEl.querySelector('iframe[src*="youtube"]');
      if (ifr) {
        console.log(
          "[YT DEBUG ADMIN] DOM iframe src=",
          ifr.getAttribute("src"),
        );

        // Détection d'erreur embed : après 2.5s, si iframe n'a pas chargé, afficher fallback
        const fallback = blockEl.querySelector(".yt-fallback");
        if (fallback && window.location.protocol !== "file:") {
          let loaded = false;
          ifr.addEventListener("load", () => {
            loaded = true;
            setTimeout(() => {
              const rect = ifr.getBoundingClientRect();
              if (rect.height < 50 || rect.width < 50) {
                ifr.style.display = "none";
                fallback.style.display = "flex";
              }
            }, 500);
          });

          setTimeout(() => {
            if (!loaded) {
              ifr.style.display = "none";
              fallback.style.display = "flex";
            }
          }, 2500);
        }
      }
    }, 0);
  }

  // Charger Twitter widgets si bloc X/Twitter
  if (block.type === "twitter" && block.url) {
    function ensureTwitterWidgets(cb) {
      if (window.twttr && window.twttr.widgets) return cb();
      if (document.querySelector("script[data-twitter-widgets]")) {
        const t = setInterval(() => {
          if (window.twttr && window.twttr.widgets) {
            clearInterval(t);
            cb();
          }
        }, 50);
        return;
      }
      const s = document.createElement("script");
      s.src = "https://platform.twitter.com/widgets.js";
      s.async = true;
      s.defer = true;
      s.setAttribute("data-twitter-widgets", "1");
      s.onload = cb;
      document.head.appendChild(s);
    }

    const container = blockEl.querySelector(".twitter-preview");
    if (container) {
      ensureTwitterWidgets(() => {
        if (window.twttr && window.twttr.widgets) {
          window.twttr.widgets.load(container);
        }
      });
    }
  }

  return blockEl;
}

/**
 * ADDED: Helper pour échapper le HTML
 */
/**
 * ADDED: Formate une date YYYY-MM-DD en français (ex: "24 avril 2025")
 */
function formatDateFrench(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";

  // Vérifier le format YYYY-MM-DD
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return dateStr; // Retourner tel quel si format non reconnu

  const year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10);
  const day = parseInt(dateMatch[3], 10);

  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];

  if (month >= 1 && month <= 12) {
    return `${day} ${months[month - 1]} ${year}`;
  }

  return dateStr; // Fallback si mois invalide
}

/**
 * ADDED: Helper pour extraire l'ID YouTube depuis différentes URLs
 */
function extractYouTubeId(rawUrl) {
  const url = (rawUrl || "").trim();
  if (!url) return "";
  try {
    const u = new URL(url);
    // youtu.be/ID
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.split("/").filter(Boolean)[0] || "";
    }
    // youtube.com/watch?v=ID
    const v = u.searchParams.get("v");
    if (v) return v;
    // /shorts/ID
    const parts = u.pathname.split("/").filter(Boolean);
    const shortsIdx = parts.indexOf("shorts");
    if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
    // /embed/ID
    const embedIdx = parts.indexOf("embed");
    if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    return "";
  } catch (e) {
    // fallback regex si URL() échoue
    const m = url.match(
      /(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/,
    );
    return m ? m[1] : "";
  }
}

/**
 * ADDED: Helper pour générer l'URL embed YouTube safe
 */
function getYouTubeEmbedSrc(videoId) {
  if (!videoId) return "";
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
}

/**
 * ADDED: Helper pour obtenir la thumbnail YouTube
 */
function getYouTubeThumb(videoId) {
  if (!videoId) return "";
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * ADDED: Fonction factorisée pour rendre une carte offre (réutilisable pour articles et promos)
 * @param {Object} offerBlock - Bloc offre avec title, url, imageUrl, promo, oldPrice, price, buttonText, domain, newTab
 * @param {Object} article - Article parent (optionnel, pour resolveOfferImage)
 * @returns {string} - HTML de la carte offre ou '' si invalide
 */
function renderOfferCard(offerBlock, article = null) {
  if (!offerBlock) return "";

  const title = toText(offerBlock.title) || "";
  const url = toText(offerBlock.url) || "";

  if (!title || !url) return ""; // Obligatoire

  // Résoudre l'image : depuis offerBlock, ou depuis article si fourni
  let offerImg = "";
  if (offerBlock.imageUrl) {
    offerImg = toText(offerBlock.imageUrl);
  } else if (offerBlock.image) {
    offerImg = toText(offerBlock.image);
  } else if (article) {
    // Fallback : utiliser resolveOfferImage si article fourni
    offerImg = resolveOfferImage(article);
  }

  // Compatibilité: lire promo ou promoText
  const promoText = toText(offerBlock.promo || offerBlock.promoText) || "";
  // Compatibilité: lire oldPrice ou priceOld
  const priceOld = toText(offerBlock.oldPrice || offerBlock.priceOld) || "";
  // Compatibilité: lire newPrice, priceNew, price, ou promoPrice
  const priceNew =
    toText(
      offerBlock.newPrice ||
        offerBlock.priceNew ||
        offerBlock.price ||
        offerBlock.promoPrice,
    ) || "";
  const buttonText = toText(offerBlock.buttonText) || "Voir l'offre";
  // Compatibilité: lire domain ou domainNote
  const domainNote = toText(offerBlock.domain || offerBlock.domainNote) || "";
  const newTab = offerBlock.newTab !== false; // default true

  // Auto-fill domainNote from URL domain if empty (sauf pour les promos)
  let finalDomainNote = domainNote;
  if (!finalDomainNote && url && article) {
    // Seulement pour les articles, pas pour les promos standalone
    try {
      const urlObj = new URL(url);
      finalDomainNote = urlObj.hostname.replace("www.", "");
    } catch (e) {
      // Invalid URL, keep domainNote empty
    }
  }

  const targetAttr = newTab ? 'target="_blank" rel="noopener"' : "";
  return `<a class="offer-card" href="${escapeHtml(url)}" ${targetAttr}>
        <div class="offer-card__media">
            ${offerImg ? `<img src="${escapeHtml(offerImg)}" alt="${escapeHtml(title)}" loading="lazy">` : ""}
            ${promoText ? `<span class="offer-card__badge">${escapeHtml(promoText)}</span>` : ""}
        </div>
        <div class="offer-card__body">
            <div class="offer-card__title">${escapeHtml(title)}</div>
            ${
              priceOld || priceNew
                ? `<div class="offer-card__prices">
                ${priceOld ? `<span class="offer-card__old">${escapeHtml(priceOld)}</span>` : ""}
                ${priceNew ? `<span class="offer-card__new">${escapeHtml(priceNew)}</span>` : ""}
            </div>`
                : ""
            }
            <div class="offer-card__actions">
                <span class="offer-card__btn">${escapeHtml(buttonText)}</span>
                ${finalDomainNote ? `<span class="offer-card__note">${escapeHtml(finalDomainNote)}</span>` : ""}
            </div>
        </div>
    </a>`;
}

/**
 * ADDED: Ajoute un nouveau bloc
 */
function addArticleBlock(type) {
  // Lire les valeurs actuelles depuis le DOM pour préserver les modifications
  syncArticleBlocksFromDOM();

  const newBlock = {
    type,
    blockId: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  if (type === "text") {
    newBlock.text = "";
  } else if (type === "heading") {
    newBlock.level = 2; // Utiliser 2 pour h2, 3 pour h3
    newBlock.text = "";
  } else if (type === "image") {
    newBlock.url = "";
    newBlock.alt = "";
    newBlock.caption = "";
  } else if (type === "offer") {
    // ADDED: Bloc offre avec valeurs par défaut (nouveaux noms: image, promo, oldPrice, newPrice, domain)
    // IMPORTANT: block.url (pas article.link)
    newBlock.title = "";
    newBlock.url = ""; // block.url du bloc offer, pas article.link
    newBlock.image = "";
    newBlock.promo = "";
    newBlock.oldPrice = "";
    newBlock.newPrice = "";
    newBlock.buttonText = "Voir l'offre";
    newBlock.domain = "";
    newBlock.newTab = true;
  } else if (type === "youtube") {
    newBlock.url = "";
  } else if (type === "twitter") {
    newBlock.url = "";
  }

  articleBlocks.push(newBlock);
  renderArticleBlocks(articleBlocks);
}

/**
 * REMOVED: Fonction dupliquée - la bonne version est à la ligne 5989
 * Cette fonction écrivait la bonne version qui traite les blocs offer
 */

/**
 * ADDED: Supprime un bloc par son index
 */
function removeArticleBlock(index) {
  syncArticleBlocksFromDOM();
  if (index >= 0 && index < articleBlocks.length) {
    articleBlocks.splice(index, 1);
    renderArticleBlocks(articleBlocks);
  }
}

/**
 * ADDED: Déplace un bloc par son index
 */
function moveArticleBlock(index, direction) {
  syncArticleBlocksFromDOM();
  if (direction === "up" && index > 0) {
    [articleBlocks[index], articleBlocks[index - 1]] = [
      articleBlocks[index - 1],
      articleBlocks[index],
    ];
    renderArticleBlocks(articleBlocks);
  } else if (direction === "down" && index < articleBlocks.length - 1) {
    [articleBlocks[index], articleBlocks[index + 1]] = [
      articleBlocks[index + 1],
      articleBlocks[index],
    ];
    renderArticleBlocks(articleBlocks);
  }
}

/**
 * ADDED: Helper SAFE pour récupérer les blocs d'un article (compatibilité)
 */
function getArticleBlocks(article) {
  try {
    if (!article) return [];
    if (Array.isArray(article.contentBlocks)) return article.contentBlocks;
    if (Array.isArray(article.blocks)) return article.blocks;
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * ADDED: Rend le contenu d'un article avec blocs sur les pages publiques
 */
function renderArticlePage() {
  // Garde de sécurité : vérifier que l'élément DOM existe
  const articlePage = document.getElementById("article-page");
  if (!articlePage) return;

  // Garde de sécurité : vérifier que les fonctions nécessaires existent
  if (typeof getArticleBySlug !== "function" || typeof getArticlesData !== "function") {
    console.error("[renderArticlePage] Fonctions requises non disponibles");
    articlePage.innerHTML = `
      <div style="max-width: 800px; margin: var(--spacing-xl) auto; padding: var(--spacing-xl); text-align: center;">
        <h1 style="font-size: 2em; margin-bottom: var(--spacing-md); color: var(--color-text-primary);">Erreur technique</h1>
        <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-lg);">Impossible de charger l'article.</p>
        <a href="index.html" class="btn btn-primary">Retour à l'accueil</a>
      </div>
    `;
    return;
  }

  // Récupérer les paramètres d'URL de manière safe
  const urlParams = new URLSearchParams(window.location.search);
  const articleSlug = urlParams.get("slug");
  const articleId = urlParams.get("id");

  if (!articleSlug && !articleId) {
    // État vide si aucun paramètre
    articlePage.innerHTML = `
      <div style="max-width: 800px; margin: var(--spacing-xl) auto; padding: var(--spacing-xl); text-align: center;">
        <h1 style="font-size: 2em; margin-bottom: var(--spacing-md); color: var(--color-text-primary);">Article introuvable</h1>
        <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-lg);">Aucun identifiant d'article n'a été fourni.</p>
        <a href="index.html" class="btn btn-primary">Retour à l'accueil</a>
      </div>
    `;
    return;
  }

  // Recherche de l'article avec gestion d'erreur
  let article = null;
  try {
    if (articleSlug) {
      article = getArticleBySlug(articleSlug);
    }
    if (!article && articleId) {
      const articles = getArticlesData();
      if (Array.isArray(articles)) {
        article = articles.find((a) => String(a.id) === String(articleId));
        // Si trouvé via id et que l'article a un slug, normaliser l'URL
        if (article && article.slug && window.history && window.history.replaceState) {
          const newUrl = `article.html?slug=${encodeURIComponent(article.slug)}`;
          window.history.replaceState(null, "", newUrl);
        }
      }
    }
  } catch (error) {
    console.error("[renderArticlePage] Erreur lors de la recherche d'article:", error);
  }

  if (!article) {
    // État article non trouvé
    if (typeof document !== "undefined" && document.title) {
      document.title = "Article introuvable – LE MONT DE LERMITE";
    }
    articlePage.innerHTML = `
      <div style="max-width: 800px; margin: var(--spacing-xl) auto; padding: var(--spacing-xl); text-align: center;">
        <h1 style="font-size: 2em; margin-bottom: var(--spacing-md); color: var(--color-text-primary);">Article introuvable</h1>
        <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-lg);">L'article demandé n'existe pas ou a été supprimé.</p>
        <a href="index.html" class="btn btn-primary">Retour à l'accueil</a>
      </div>
    `;
    return;
  }

  // Tout en haut de la fonction, après avoir validé que article existe, définir contentBlocks localement
  const contentBlocks =
    Array.isArray(article.contentBlocks) ? article.contentBlocks :
    Array.isArray(article.blocks) ? article.blocks :
    Array.isArray(article.content) ? article.content :
    [];

  // Construire le HTML de la page article de manière robuste
  const title = (typeof toText === "function" ? toText(article.title) : article.title) || "Sans titre";
  const excerpt = (typeof toText === "function" ? toText(article.excerpt) : article.excerpt) || "";
  const cover = (typeof toText === "function" ? toText(article.cover) : article.cover) || "";

  // Mise à jour SEO (document.title et meta description) - avec vérification de sécurité
  if (typeof document !== "undefined" && document.title) {
    document.title = `${title} – LE MONT DE LERMITE`;
  }

  // Mettre à jour ou créer la meta description - avec vérification de sécurité
  if (typeof document !== "undefined" && document.querySelector && document.head) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }

    // Génération robuste de meta description:
    // 1) Si excerpt/summary existe -> utiliser ça
    let descriptionText = excerpt || article.summary || "";

    // 2) Sinon, si contentBlocks contient un bloc type "text" avec .text -> utiliser ça
    if (!descriptionText && contentBlocks && Array.isArray(contentBlocks) && contentBlocks.length > 0) {
      const firstTextBlock = contentBlocks.find(
        (block) => block && block.type === "text" && block.text
      );
      if (firstTextBlock) {
        descriptionText = (typeof toText === "function" ? toText(firstTextBlock.text) : firstTextBlock.text) || "";
        descriptionText = descriptionText.substring(0, 160); // Limiter à 160 caractères pour SEO
      }
    }

    // 3) Sinon fallback -> title
    if (!descriptionText) {
      descriptionText = title;
    }

    if (descriptionText.length > 160) {
      descriptionText = descriptionText.substring(0, 157) + "...";
    }
    metaDesc.setAttribute("content", descriptionText);
  }

  // Extraction des blocs de contenu de manière robuste (utilise maintenant contentBlocks local)
  const blocks = contentBlocks;

  // Construction du contenu HTML
  let contentHtml = "";

  // SI blocks est un array NON VIDE : render les blocs
  if (blocks && Array.isArray(blocks) && blocks.length > 0) {
    blocks.forEach((block) => {
      if (!block || typeof block !== "object") return;

      const blockType = block.type;
      if (blockType === "text" && block.text) {
        const text = (typeof toText === "function" ? toText(block.text) : block.text) || "";
        if (text.trim()) {
          contentHtml += `<p style="margin-bottom: var(--spacing-lg); line-height: 1.8; color: var(--color-text-primary); white-space: pre-wrap;">${(typeof escapeHtml === "function" ? escapeHtml(text) : text)}</p>`;
        }
      } else if (blockType === "heading" && block.text) {
        const text = (typeof toText === "function" ? toText(block.text) : block.text) || "";
        const level = (block.level === 3 || block.level === "h3") ? 3 : 2;
        const tag = level === 3 ? "h3" : "h2";
        if (text.trim()) {
          contentHtml += `<${tag} style="margin-top: var(--spacing-xl); margin-bottom: var(--spacing-md); color: var(--color-text-primary); font-weight: var(--font-weight-semibold);">${(typeof escapeHtml === "function" ? escapeHtml(text) : text)}</${tag}>`;
        }
      }
      // Autres types de blocs peuvent être ajoutés ici si nécessaire
    });
  }

  // SINON SI article.content est une string : l'afficher
  else if (typeof article.content === "string" && article.content.trim()) {
    contentHtml = `<p style="margin-bottom: var(--spacing-lg); line-height: 1.8; color: var(--color-text-primary); white-space: pre-wrap;">${(typeof escapeHtml === "function" ? escapeHtml(article.content) : article.content)}</p>`;
  }

  // SINON : afficher message neutre
  else {
    contentHtml = `<p style="margin-bottom: var(--spacing-lg); line-height: 1.8; color: var(--color-text-secondary); font-style: italic;">Contenu à venir</p>`;
  }

  // Construction du HTML final
  let articleHtml = `<article class="article-content">`;

  // Header avec titre
  articleHtml += `<header class="article-header">`;
  articleHtml += `<h1 class="article-title">${(typeof escapeHtml === "function" ? escapeHtml(title) : title)}</h1>`;

  // Métadonnées (auteur + date) si disponibles
  if (excerpt || article.author || article.publishedAt) {
    articleHtml += `<div class="article-meta">`;
    const metaParts = [];

    if (excerpt) {
      metaParts.push((typeof escapeHtml === "function" ? escapeHtml(excerpt) : excerpt));
    }

    if (article.author) {
      const author = (typeof toText === "function" ? toText(article.author) : article.author) || "";
      if (author.trim()) {
        metaParts.push(`Par ${author.trim()}`);
      }
    }

    if (article.publishedAt) {
      const date = (typeof toText === "function" ? toText(article.publishedAt) : article.publishedAt) || "";
      if (date.trim()) {
        metaParts.push(date.trim());
      }
    }

    if (metaParts.length > 0) {
      articleHtml += metaParts.join(" • ");
    }
    articleHtml += `</div>`;
  }

  articleHtml += `</header>`;

  // Contenu
  articleHtml += `<div class="article-body">${contentHtml}</div>`;

  // Footer avec lien retour
  articleHtml += `<footer class="article-footer">`;
  articleHtml += `<a href="actu.html" class="btn btn-secondary">← Retour aux articles</a>`;
  articleHtml += `</footer>`;

  articleHtml += `</article>`;

  // Appliquer le HTML à la page
  articlePage.innerHTML = articleHtml;
}

/**
 * Fonction renderArticleContent() supprimée - plus nécessaire
 * Remplacée par renderArticlePage() plus simple et robuste
 */
function renderArticleContent() {
  function resolveOfferImage(article) {
    // 1) link direct
    const link = article?.link || {};
    const linkImageUrl =
      typeof link.imageUrl === "string" && link.imageUrl.trim()
        ? link.imageUrl.trim()
        : null;
    const linkImage =
      typeof link.image === "string" && link.image.trim()
        ? link.image.trim()
        : null;
    if (linkImageUrl) return linkImageUrl;
    if (linkImage) return linkImage;

    // 2) chercher dans blocks
    const blocks = Array.isArray(article?.contentBlocks) ? article.contentBlocks :
                   Array.isArray(article?.blocks) ? article.blocks :
                   Array.isArray(article?.content) ? article.content : [];
    const offer =
      blocks.find((b) => {
        const t = (b?.type || "").toLowerCase();
        return t === "offer" || t === "affiliation";
      }) || {};

    const candidates = [
      offer.imageUrl,
      offer.image,
      offer.img,
      offer.mediaUrl,
      offer.data?.imageUrl,
      offer.data?.image,
      offer.data?.img,
      offer.data?.mediaUrl,
      offer.link?.imageUrl,
      offer.link?.image,
      offer.link?.img,
      offer.link?.mediaUrl,
    ].filter((v) => typeof v === "string" && v.trim());

    // Résoudre l'image de l'offre

    if (candidates.length) return candidates[0].trim();

    // 3) dernier recours: regarder dans localStorage articles_override (même article) et re-check
    try {
      const raw = localStorage.getItem("lermite_articles_override");
      if (raw) {
        const arr = JSON.parse(raw);
        const a = arr.find(
          (x) => x.id === article.id || x.slug === article.slug,
        );
        if (a) {
          const l = a.link || {};
          if (typeof l.imageUrl === "string" && l.imageUrl.trim())
            return l.imageUrl.trim();
          if (typeof l.image === "string" && l.image.trim())
            return l.image.trim();
          const bs = Array.isArray(a.contentBlocks) ? a.contentBlocks :
                      Array.isArray(a.blocks) ? a.blocks :
                      Array.isArray(a.content) ? a.content : [];
          const ob =
            bs.find(
              (b) =>
                (b?.type || "").toLowerCase() === "offer" ||
                (b?.type || "").toLowerCase() === "affiliation",
            ) || {};
          const c2 = [
            ob.imageUrl,
            ob.image,
            ob.img,
            ob.mediaUrl,
            ob.data?.imageUrl,
            ob.data?.image,
            ob.link?.imageUrl,
            ob.link?.image,
          ].filter((v) => typeof v === "string" && v.trim());
          if (c2.length) return c2[0].trim();
        }
      }
    } catch (e) {}

    return "";
  }

  if (blocks.length > 0) {
    let html = "";

    blocks.forEach((block) => {
      if (block.type === "text") {
        const text = toText(block.text);
        if (text) {
          const paragraphs = text.split("\n").filter((p) => p.trim());
          if (paragraphs.length > 0) {
            paragraphs.forEach((p) => {
              html += `<p style="margin-bottom: var(--spacing-lg); line-height: 1.8; color: var(--color-text-primary); white-space: pre-wrap;">${escapeHtml(p)}</p>`;
            });
          }
        }
      } else if (block.type === "heading") {
        const levelNum =
          typeof block.level === "number"
            ? block.level
            : block.level === "h3"
              ? 3
              : 2;
        const levelTag = levelNum === 3 ? "h3" : "h2";
        const text = toText(block.text);
        if (text) {
          html += `<${levelTag} style="margin-top: var(--spacing-xl); margin-bottom: var(--spacing-md); color: var(--color-text-primary); font-size: ${levelNum === 2 ? "1.75em" : "1.5em"}; font-weight: var(--font-weight-semibold);">${escapeHtml(text)}</${levelTag}>`;
        }
      } else if (
        block.type === "image" ||
        block.type === "img" ||
        block.type === "media"
      ) {
        // ADDED: Lecture robuste du src avec fallback (sans changer les données)
        const src =
          (block && typeof block.src === "string" && block.src.trim()) ||
          (block && typeof block.url === "string" && block.url.trim()) ||
          (block && typeof block.value === "string" && block.value.trim()) ||
          (block && typeof block.image === "string" && block.image.trim()) ||
          "";

        // REMOVED: Debug display supprimé (fonctionnalité retirée)

        // Si src non vide et prévisualisable => rendre l'image
        if (src && isImageSrcPreviewable(src)) {
          const alt = toText(block.alt) || "";
          const caption = toText(block.caption) || "";
          // REMOVED: Suppression de la logique display (fonctionnalité retirée)
          // Rendu standard sans mode d'affichage
          html += `<figure class="article-media">
                        <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">
                        ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
                    </figure>`;
        }
        // Si src vide => ne rien afficher (pas d'erreur)
      } else if (block.type === "offer") {
        // ADDED: Rendu du bloc offre via fonction factorisée
        const offerHtml = renderOfferCard(block, article);
        if (offerHtml) {
          html += offerHtml;
        }
      } else if (block.type === "youtube") {
        const url = toText(block.url) || "";
        if (url) {
          const videoId = extractYouTubeId(url);
          const thumbUrl = getYouTubeThumb(videoId);
          const embedSrc = getYouTubeEmbedSrc(videoId);
          const isFileProtocol = window.location.protocol === "file:";

          // DEBUG: Log pour vérifier le src réel
          console.log(
            "[YT DEBUG FRONT] rawUrl=",
            url,
            "id=",
            videoId,
            "embedSrc=",
            embedSrc,
            "isFileProtocol=",
            isFileProtocol,
          );

          if (videoId) {
            // Fallback premium : thumbnail + icône play élégante
            if (isFileProtocol || !embedSrc) {
              // En file:// ou si pas d'embedSrc, afficher directement le fallback
              html += `<div class="article-youtube" style="width: 100%; margin: var(--spacing-xl) 0;">
                                <div class="yt-wrap" style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: var(--radius-lg); background: rgba(31, 42, 68, 0.5);">
                                    <div class="yt-fallback yt-preview" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: url('${escapeHtml(thumbUrl)}');" onclick="window.open('${escapeHtml(url)}', '_blank', 'noopener')">
                                        <div class="yt-play-icon"></div>
                                        <div class="yt-badge">YouTube</div>
                        </div>
                            </div>
                            </div>`;
            } else {
              // En http/https, afficher iframe + fallback en overlay
              html += `<div class="article-youtube" style="width: 100%; margin: var(--spacing-xl) 0;">
                                <div class="yt-wrap" style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: var(--radius-lg);">
                                    <iframe src="${escapeHtml(embedSrc)}" title="YouTube video" frameborder="0" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;" data-yt-video-id="${escapeHtml(videoId)}" data-yt-original-url="${escapeHtml(url)}"></iframe>
                                    <div class="yt-fallback yt-preview" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none; z-index: 2; background-image: url('${escapeHtml(thumbUrl)}');" onclick="window.open('${escapeHtml(url)}', '_blank', 'noopener')">
                                        <div class="yt-play-icon"></div>
                                        <div class="yt-badge">YouTube</div>
                        </div>
                                </div>
                            </div>`;
            }
          } else {
            html += `<div class="article-youtube" style="width: 100%; margin: var(--spacing-xl) 0; padding: var(--spacing-md); background: rgba(31, 42, 68, 0.3); border-radius: var(--radius-md); text-align: center; color: var(--color-text-secondary);">
                            <p>URL YouTube invalide</p>
                        </div>`;
          }
        }
      } else if (block.type === "twitter") {
        const url = toText(block.url) || "";
        if (url) {
          const tweetUrl = url.trim();
          html += `<div class="article-twitter" style="width: 100%; margin: var(--spacing-xl) 0; display: flex; justify-content: center;">
                        <blockquote class="twitter-tweet">
                            <a href="${escapeHtml(tweetUrl)}"></a>
                        </blockquote>
                    </div>`;

          // Charger Twitter widgets de façon fiable
          function ensureTwitterWidgets(cb) {
            if (window.twttr && window.twttr.widgets) return cb();
            if (document.querySelector("script[data-twitter-widgets]")) {
              const t = setInterval(() => {
                if (window.twttr && window.twttr.widgets) {
                  clearInterval(t);
                  cb();
                }
              }, 50);
              return;
            }
            const s = document.createElement("script");
            s.src = "https://platform.twitter.com/widgets.js";
            s.async = true;
            s.defer = true;
            s.setAttribute("data-twitter-widgets", "1");
            s.onload = cb;
            document.head.appendChild(s);
          }

          ensureTwitterWidgets(() => {
            const container = contentDiv.querySelector(".article-twitter");
            if (container && window.twttr && window.twttr.widgets) {
              window.twttr.widgets.load(container);
            }
          });
        }
      }
    });

    // REMOVED: Rendu legacy "promo du bas" basé sur article.link supprimé
    // On ne rend plus que les blocs offer depuis contentBlocks

    contentDiv.innerHTML = html;

    // Détection d'erreur embed YouTube : après 2.5s, si iframe n'a pas chargé, afficher fallback
    setTimeout(() => {
      const youtubeBlocks = contentDiv.querySelectorAll(".article-youtube");
      youtubeBlocks.forEach((ytBlock) => {
        const ifr = ytBlock.querySelector('iframe[src*="youtube"]');
        const fallback = ytBlock.querySelector(".yt-fallback");
        if (ifr && fallback && window.location.protocol !== "file:") {
          let loaded = false;
          ifr.addEventListener("load", () => {
            loaded = true;
            // Vérifier si l'iframe contient une erreur (on ne peut pas lire le contenu, mais on peut détecter visuellement)
            setTimeout(() => {
              // Si l'iframe est très petite ou invisible, probablement une erreur
              const rect = ifr.getBoundingClientRect();
              if (rect.height < 50 || rect.width < 50) {
                ifr.style.display = "none";
                fallback.style.display = "flex";
              }
            }, 500);
          });

          setTimeout(() => {
            if (!loaded) {
              // Si pas chargé après 2.5s, afficher fallback
              ifr.style.display = "none";
              fallback.style.display = "flex";
            }
          }, 2500);
        }
      });
    }, 0);
  } else {
    // Fallback sur l'ancien contenu
    const content = toText(article.content);
    if (content) {
      const paragraphs = content.split("\n").filter((p) => p.trim());
      let html = "";
      paragraphs.forEach((p) => {
        html += `<p style="margin-bottom: var(--spacing-lg); line-height: 1.8; color: var(--color-text-primary);">${escapeHtml(p.trim())}</p>`;
      });
      contentDiv.innerHTML = html;
    } else if (excerpt) {
      contentDiv.innerHTML = `<p style="margin-bottom: var(--spacing-lg); line-height: 1.8; color: var(--color-text-primary);">${escapeHtml(excerpt)}</p>`;
    }
  }

  // ADDED: Construire la page complète
  articlePage.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; padding: var(--spacing-xl);">
            <a href="index.html" class="btn btn-secondary" style="margin-bottom: var(--spacing-lg); display: inline-block;">← Retour</a>
            ${heroHtml}
            ${metaHtml}
            <h1 style="font-size: 2.5em; margin-bottom: var(--spacing-md); color: var(--color-text-primary); font-weight: var(--font-weight-semibold);">${escapeHtml(title)}</h1>
            ${excerpt ? `<p style="font-size: 1.125em; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); line-height: 1.6;">${escapeHtml(excerpt)}</p>` : ""}
        </div>
    `;

  // ADDED: Ajouter le contenu après le titre
  const titleContainer = articlePage.querySelector("h1").parentElement;
  titleContainer.appendChild(contentDiv);

  // REMOVED: Injection du bloc legacy link-card supprimée définitivement
}

/**
 * ADDED: Rend le contenu d'un article avec blocs sur les pages publiques (ancienne fonction, gardée pour compatibilité)
 */
function renderArticleContent() {
  // Fonction obsolète - remplacée par renderArticlePage()
  console.warn("[renderArticleContent] Fonction obsolète - utiliser renderArticlePage()");
  return;
      } else if (block.type === "heading") {
        // Convertir level (2/3 ou 'h2'/'h3') en balise HTML
        const levelNum =
          typeof block.level === "number"
            ? block.level
            : block.level === "h3"
              ? 3
              : 2;
        const levelTag = levelNum === 3 ? "h3" : "h2";
        const text = toText(block.text);
        if (text) {
          html += `<${levelTag} style="margin-top: var(--spacing-xl); margin-bottom: var(--spacing-md); color: var(--color-text-primary); font-size: ${levelNum === 2 ? "1.75em" : "1.5em"}; font-weight: var(--font-weight-semibold);">${escapeHtml(text)}</${levelTag}>`;
        }
      } else if (
        block.type === "image" ||
        block.type === "img" ||
        block.type === "media"
      ) {
        // ADDED: Lecture robuste du src avec fallback (sans changer les données)
        const src =
          (block && typeof block.src === "string" && block.src.trim()) ||
          (block && typeof block.url === "string" && block.url.trim()) ||
          (block && typeof block.value === "string" && block.value.trim()) ||
          (block && typeof block.image === "string" && block.image.trim()) ||
          "";

        // REMOVED: Debug display supprimé (fonctionnalité retirée)

        // Si src non vide et prévisualisable => rendre l'image
        if (src && isImageSrcPreviewable(src)) {
          const alt = toText(block.alt) || "";
          const caption = toText(block.caption) || "";
          // REMOVED: Suppression de la logique display (fonctionnalité retirée)
          // Rendu standard sans mode d'affichage
          html += `<figure class="article-media">
                        <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">
                        ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
                    </figure>`;
        }
        // Si src vide => ne rien afficher (pas d'erreur)
      }
    });

    contentDiv.innerHTML = html;

    // DEBUG: Vérifier le src réel dans le DOM après insertion (YouTube)
    setTimeout(() => {
      const ifr = contentDiv.querySelector('iframe[src*="youtube"]');
      if (ifr) {
        console.log(
          "[YT DEBUG FRONT] DOM iframe src=",
          ifr.getAttribute("src"),
        );
      }
    }, 0);
  } else {
    // Fallback sur l'ancien contenu (content ou excerpt)
    const content = toText(article.content);
    const excerpt = toText(article.excerpt);

    if (content) {
      // Convertir les retours à la ligne en paragraphes
      const paragraphs = content.split("\n").filter((p) => p.trim());
      let html = "";
      paragraphs.forEach((p) => {
        html += `<p style="margin-bottom: var(--spacing-lg); line-height: 1.8; color: var(--color-text-primary);">${escapeHtml(p.trim())}</p>`;
      });
      contentDiv.innerHTML = html;
    } else if (excerpt) {
      contentDiv.innerHTML = `<p style="margin-bottom: var(--spacing-lg); line-height: 1.8; color: var(--color-text-primary);">${escapeHtml(excerpt)}</p>`;
    }
  }
}

/**
 * ADDED: Ouvre le modal article en mode création ou édition
 */
function openArticleModal(mode, article = null) {
  const modal = document.getElementById("articleModal");
  const title = document.getElementById("articleModalTitle");
  const form = document.getElementById("articleForm");

  if (!modal || !title || !form) return;

  // ADDED: Remplir le select des jeux
  const gamesSelect = document.getElementById("article-relatedGameId");
  if (gamesSelect) {
    const games = getGamesData();
    gamesSelect.innerHTML = '<option value="">Aucun</option>';
    games.forEach((game) => {
      const option = document.createElement("option");
      option.value = game.id;
      option.textContent = game.title;
      gamesSelect.appendChild(option);
    });
  }

  clearArticleFormErrors();

  if (mode === "create") {
    title.textContent = "Ajouter un article";
    form.reset();
    document.getElementById("article-id").value = "";
    updateArticleCoverPreview("");
    // ADDED: Réinitialiser les blocs
    articleBlocks = [];
    renderArticleBlocks([]);
  } else if (mode === "edit" && article) {
    title.textContent = "Modifier un article";
    fillArticleForm(article);
  }

  // ADDED: Afficher les médias récents sous le champ cover
  renderRecentMedia("article");

  modal.classList.add("is-open");

  // ADDED: Focus sur le premier champ
  const firstInput = form.querySelector('input[type="text"]');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

/**
 * ADDED: Ferme le modal article
 */
function closeArticleModal() {
  const modal = document.getElementById("articleModal");
  if (modal) {
    modal.classList.remove("is-open");
    clearArticleFormErrors();
    const form = document.getElementById("articleForm");
    if (form) {
      form.reset();
    }
    // ADDED: Reset propre du preview cover
    const previewImg = document.getElementById("articleCoverPreviewImg");
    const previewPlaceholder = document.getElementById(
      "articleCoverPreviewPlaceholder",
    );
    const coverError = document.getElementById("error-article-cover");
    if (previewImg) {
      previewImg.style.display = "none";
      previewImg.src = "";
    }
    if (previewPlaceholder) {
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Aperçu indisponible";
    }
    if (coverError) {
      coverError.textContent = "";
    }
    // ADDED: Réinitialiser les blocs
    articleBlocks = [];
    renderArticleBlocks([]);
    currentBlockImageIndex = null;
  }
}

/**
 * ADDED: Affiche les erreurs de validation article
 */
function showArticleFormErrors(errors) {
  Object.keys(errors).forEach((field) => {
    const input = document.getElementById(field);
    const errorEl = document.getElementById(`error-${field}`);

    if (input) {
      input.classList.add("invalid", "is-invalid");
    }

    if (errorEl) {
      errorEl.textContent = errors[field];
    }
  });
}

/**
 * ADDED: Efface les erreurs de validation article
 */
function clearArticleFormErrors() {
  document
    .querySelectorAll(
      "#articleForm input, #articleForm textarea, #articleForm select",
    )
    .forEach((el) => {
      el.classList.remove("invalid", "is-invalid");
    });
  document.querySelectorAll("#articleForm .form-error").forEach((el) => {
    el.textContent = "";
  });
}

/**
 * ADDED: Met à jour le preview de l'image cover article (version robuste avec fallback)
 * Zone admin uniquement - ne s'exécute que sur la page admin
 */
function updateArticleCoverPreview(url, { silent = true } = {}) {
  // ADDED: Guard admin - ne s'exécute que sur la page admin
  if (document.body?.dataset?.page !== "admin") return;

  const previewImg = document.getElementById("articleCoverPreviewImg");
  const previewPlaceholder = document.getElementById(
    "articleCoverPreviewPlaceholder",
  );
  const coverInput = document.getElementById("article-cover");
  const coverError = document.getElementById("error-article-cover");

  if (!previewImg || !previewPlaceholder) return;

  const urlTrimmed = toText(url);

  // Si URL vide, cacher l'image et afficher le placeholder
  if (!urlTrimmed) {
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "block";
    previewPlaceholder.textContent = "Aperçu indisponible";
    if (coverInput) coverInput.classList.remove("invalid", "is-invalid");
    if (coverError) coverError.textContent = "";
    return;
  }

  // ADDED: Vérification simple URL http/https (warning, pas bloquant)
  const urlPattern = /^https?:\/\//i;
  if (!urlPattern.test(urlTrimmed)) {
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "block";
    previewPlaceholder.textContent = "URL invalide";
    if (coverInput) coverInput.classList.add("invalid", "is-invalid");
    if (coverError)
      coverError.textContent = "L'URL doit commencer par http:// ou https://";
    return;
  }

  // Charger l'image
  const img = new Image();

  img.onload = function () {
    // ADDED: Image chargée avec succès
    try {
      previewImg.src = urlTrimmed;
      previewImg.style.display = "block";
      previewPlaceholder.style.display = "none";
      if (coverInput) coverInput.classList.remove("invalid", "is-invalid");
      if (coverError) coverError.textContent = "";
    } catch (e) {
      // ADDED: Fallback silencieux en cas d'erreur (zéro console error)
      previewImg.style.display = "none";
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Erreur d'affichage";
    }
  };

  img.onerror = function () {
    // ADDED: Image introuvable ou invalide (fallback robuste)
    try {
      previewImg.style.display = "none";
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Image introuvable";
      // ADDED: Marquer le champ en invalid avec erreur inline (warning, pas bloquant)
      if (coverInput) coverInput.classList.add("invalid", "is-invalid");
      if (coverError)
        coverError.textContent = "Image introuvable ou URL invalide";
    } catch (e) {
      // ADDED: Fallback silencieux (zéro console error)
      previewImg.style.display = "none";
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Erreur";
    }
  };

  // ADDED: Déclencher le chargement (avec gestion d'erreur silencieuse)
  try {
    img.src = urlTrimmed;
  } catch (e) {
    // ADDED: Fallback si l'URL est invalide (zéro console error)
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "block";
    previewPlaceholder.textContent = "URL invalide";
    if (coverInput) coverInput.classList.add("invalid", "is-invalid");
    if (coverError)
      coverError.textContent = "Image introuvable ou URL invalide";
  }
}

/**
 * ADDED: Crée un nouvel article
 */
function createArticle(payload) {
  const articles = getArticlesData();

  // ADDED: Utiliser uniquement payload.slug (généré par readArticleForm()), sans régénération
  const slug = payload && typeof payload.slug === "string" ? payload.slug : "";

  const id = generateArticleId(articles, slug);
  const now = new Date().toISOString();

  const newArticle = {
    id,
    title: payload.title,
    slug: slug,
    category: payload.category,
    relatedGameId: payload.relatedGameId || "",
    cover: payload.cover || "",
    excerpt: payload.excerpt || "",
    content: payload.content || "",
    createdAt: now,
    updatedAt: now,
    featured: payload.featured || false,
    author: (payload.author || payload.authorName || "").trim(),
    authorName: (payload.authorName || payload.author || "").trim(), // Garder authorName pour compatibilité
    publishedAt: (payload.publishedAt || "").trim(),
    link: payload.link || {
      type: "none",
      url: "",
      title: "",
      text: "",
      buttonText: "",
      discount: "",
    }, // ADDED: Objet link standardisé
  };

  // ADDED: Ajouter contentBlocks si présent
  if (
    payload.contentBlocks &&
    Array.isArray(payload.contentBlocks) &&
    payload.contentBlocks.length > 0
  ) {
    newArticle.contentBlocks = payload.contentBlocks;
    // ADDED: Compat ancien schéma - dupliquer dans blocks pour lecture legacy et debug
    newArticle.blocks = payload.contentBlocks;
  }

  articles.push(newArticle);
  const saved = saveArticlesOverride(articles);
  if (!saved) {
    // Erreur de quota - ne pas fermer le modal, laisser l'utilisateur corriger
    return;
  }
  // ADDED: Debug preuve après save (admin uniquement)
  console.log(
    "[admin] saved article (create)",
    newArticle.id,
    "contentBlocks:",
    newArticle.contentBlocks?.length,
    "blocks:",
    newArticle.blocks?.length,
  );
  console.debug(
    "[admin] saved contentBlocks sample (create)",
    newArticle.contentBlocks?.filter((b) => b.type === "image").slice(0, 2),
  );
  renderAdminArticlesList();
  closeArticleModal();
}

/**
 * ADDED: Met à jour un article existant
 */
function updateArticle(id, payload) {
  const articles = getArticlesData();
  const article = articles.find((a) => a.id === id);

  if (!article) return;

  // ADDED: Utiliser uniquement payload.slug (généré par readArticleForm()), sans régénération
  const slug = payload && typeof payload.slug === "string" ? payload.slug : "";

  const now = new Date().toISOString();

  // ADDED: Merger les données (id immuable, slug mis à jour si nécessaire, updatedAt mis à jour)
  const authorValue = (payload.author || payload.authorName || "").trim();
  Object.assign(article, {
    title: payload.title,
    slug: slug,
    category: payload.category,
    relatedGameId: payload.relatedGameId || "",
    cover: payload.cover || "",
    excerpt: payload.excerpt || "",
    content: payload.content || "",
    featured: payload.featured || false,
    author: authorValue, // Utiliser 'author' pour cohérence
    authorName: authorValue, // Garder authorName pour compatibilité
    publishedAt: (payload.publishedAt || "").trim(),
    link: payload.link || {
      type: "none",
      url: "",
      title: "",
      text: "",
      button: "",
      discount: "",
    }, // ADDED: Objet link standardisé
    updatedAt: now,
  });

  // ADDED: Gérer contentBlocks (ajouter si présent, supprimer si vide)
  if (
    payload.contentBlocks &&
    Array.isArray(payload.contentBlocks) &&
    payload.contentBlocks.length > 0
  ) {
    article.contentBlocks = payload.contentBlocks;
    // ADDED: Compat ancien schéma - dupliquer dans blocks pour lecture legacy et debug
    article.blocks = payload.contentBlocks;
  } else {
    // Supprimer contentBlocks si vide ou absent
    delete article.contentBlocks;
    // Supprimer aussi l'ancien champ blocks pour compatibilité
    delete article.blocks;
  }

  const saved = saveArticlesOverride(articles);
  if (!saved) {
    // Erreur de quota - ne pas fermer le modal, laisser l'utilisateur corriger
    return;
  }
  // ADDED: Debug preuve après save (admin uniquement)
  console.log(
    "[admin] saved article (update)",
    article.id,
    "contentBlocks:",
    article.contentBlocks?.length,
    "blocks:",
    article.blocks?.length,
  );
  console.debug(
    "[admin] saved contentBlocks sample (update)",
    article.contentBlocks?.filter((b) => b.type === "image").slice(0, 2),
  );
  renderAdminArticlesList();
  closeArticleModal();
}

/**
 * ADDED: Supprime un article
 */
function deleteArticle(id) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) {
    return;
  }

  const articles = getArticlesData();
  const filtered = articles.filter((a) => a.id !== id);
  saveArticlesOverride(filtered);
  renderAdminArticlesList();

  // ADDED: Mise à jour des compteurs admin
  updateAdminSiteCounters();
}

/**
 * ADDED: Affiche la liste des articles dans l'admin
 */
function renderAdminArticlesList() {
  // ADDED: Guard pour protéger la home
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) return;

  const list = document.getElementById("adminArticlesList");
  if (!list) return;

  const articles = getArticlesData();
  const games = getGamesData();

  if (articles.length === 0) {
    list.innerHTML = '<div class="empty-state">Aucun article</div>';
    return;
  }

  list.innerHTML = articles
    .map((article) => {
      const game = article.relatedGameId
        ? games.find((g) => g.id === article.relatedGameId)
        : null;
      const gameName = game ? game.title : "";
      const categoryLabels = {
        actu: "Actu",
        test: "Test",
        guide: "Guide",
        "bons-plans": "Bons plans",
      };
      const categoryLabel =
        categoryLabels[article.category] || article.category;

      return `
            <div class="article-item" data-article-id="${article.id}">
                <div class="article-item-info">
                    <div class="article-item-title">${article.title || "Sans titre"}</div>
                    <div class="article-item-meta">
                        <span class="article-category-badge">${categoryLabel}</span>
                        ${gameName ? `<span>Lié à: ${gameName}</span>` : ""}
                    </div>
                </div>
                <div class="article-item-actions">
                    <button class="btn btn-secondary btn-edit-article" data-article-id="${article.id}">Modifier</button>
                    <button class="btn btn-danger btn-delete-article" data-article-id="${article.id}">Supprimer</button>
                </div>
            </div>
        `;
    })
    .join("");

  // ADDED: Appliquer le fallback aux images de cette liste
  attachImageFallback(list);
}

/**
 * ADDED: Rend la liste des bugs dans l'admin
 */
function renderAdminBugsList() {
  // Guard pour protéger la home
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) return;

  const list = document.getElementById("adminBugsList");
  if (!list) return;

  const bugs = getBugsData();

  // Trier : open d'abord, puis cleared, les plus récents en haut
  bugs.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "open" ? -1 : 1;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (bugs.length === 0) {
    list.innerHTML = '<div class="empty-state">Aucun bug répertorié</div>';
    return;
  }

  const severityLabels = {
    low: "Faible",
    medium: "Moyen",
    high: "Élevé",
  };

  const statusLabels = {
    open: "Ouvert",
    cleared: "Corrigé",
  };

  list.innerHTML = bugs
    .map((bug) => {
      const severityLabel = severityLabels[bug.severity] || bug.severity;
      const statusLabel = statusLabels[bug.status] || bug.status;
      const createdDate = new Date(bug.createdAt).toLocaleDateString("fr-FR");
      const clearedDate = bug.clearedAt
        ? new Date(bug.clearedAt).toLocaleDateString("fr-FR")
        : "";

      return `
            <div class="bug-item" data-bug-id="${bug.id}" style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-md); background: rgba(31, 42, 68, 0.3); border: 1px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: var(--spacing-sm); transition: all var(--transition-base);">
                <div class="bug-item-info" style="flex: 1;">
                    <div class="bug-item-title" style="font-weight: var(--font-weight-semibold); color: var(--color-text-primary); margin-bottom: var(--spacing-xs);">${bug.title || "Sans titre"}</div>
                    <div class="bug-item-meta" style="display: flex; gap: var(--spacing-md); flex-wrap: wrap; font-size: 0.875em; color: var(--color-text-secondary);">
                        <span style="display: inline-block; padding: 2px 8px; border-radius: var(--radius-sm); background: ${bug.severity === "high" ? "rgba(239, 68, 68, 0.2)" : bug.severity === "medium" ? "rgba(251, 191, 36, 0.2)" : "rgba(34, 197, 94, 0.2)"}; color: ${bug.severity === "high" ? "#fca5a5" : bug.severity === "medium" ? "#fcd34d" : "#86efac"}; font-weight: var(--font-weight-medium);">${severityLabel}</span>
                        <span style="color: ${bug.status === "cleared" ? "var(--color-accent)" : "var(--color-text-secondary)"};">${statusLabel}</span>
                        ${bug.page ? `<span>Page: ${bug.page}</span>` : ""}
                        ${bug.reporter ? `<span>Répertorié par: ${bug.reporter}</span>` : ""}
                        <span>Créé le: ${createdDate}</span>
                        ${clearedDate ? `<span>Corrigé le: ${clearedDate}</span>` : ""}
                    </div>
                    ${bug.desc ? `<div class="bug-item-desc" style="margin-top: var(--spacing-xs); font-size: 0.875em; color: var(--color-text-secondary);">${bug.desc.length > 100 ? bug.desc.substring(0, 100) + "..." : bug.desc}</div>` : ""}
                </div>
                <div class="bug-item-actions" style="display: flex; gap: var(--spacing-sm);">
                    ${
                      bug.status === "open"
                        ? `<button class="btn btn-success btn-clear-bug" data-bug-id="${bug.id}" style="font-size: 0.875em;">CLEAR</button>`
                        : `<button class="btn btn-secondary btn-reopen-bug" data-bug-id="${bug.id}" style="font-size: 0.875em;">Rouvrir</button>`
                    }
                    <button class="btn btn-danger btn-delete-bug" data-bug-id="${bug.id}" style="font-size: 0.875em;">Supprimer</button>
                </div>
            </div>
        `;
    })
    .join("");
}

/**
 * ADDED: Rend la liste des demandes de contact dans l'admin
 */
function renderAdminContactRequestsList() {
  // Guard pour protéger la home
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) return;

  const list = document.getElementById("adminContactRequestsList");
  if (!list) return;

  const requests = getContactRequests();

  // Trier : new d'abord, puis read, puis closed, plus récent en haut
  requests.sort((a, b) => {
    const statusOrder = { new: 0, read: 1, closed: 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (requests.length === 0) {
    list.innerHTML = '<div class="empty-state">Aucune demande de contact</div>';
    return;
  }

  const topicLabels = {
    bug: "Bug",
    partenariat: "Partenariat",
    autre: "Autre",
  };

  const statusLabels = {
    new: "Nouveau",
    read: "Lu",
    closed: "Fermé",
  };

  list.innerHTML = requests
    .map((request) => {
      const topicLabel = topicLabels[request.topic] || request.topic;
      const statusLabel = statusLabels[request.status] || request.status;
      const createdDate = new Date(request.createdAt).toLocaleDateString(
        "fr-FR",
      );
      const createdTime = new Date(request.createdAt).toLocaleTimeString(
        "fr-FR",
        { hour: "2-digit", minute: "2-digit" },
      );

      return `
            <div class="contact-request-item" data-request-id="${request.id}" style="display: flex; justify-content: space-between; align-items: flex-start; padding: var(--spacing-md); background: rgba(31, 42, 68, 0.3); border: 1px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: var(--spacing-sm); transition: all var(--transition-base);">
                <div class="contact-request-info" style="flex: 1;">
                    <div class="contact-request-header" style="display: flex; gap: var(--spacing-md); align-items: center; margin-bottom: var(--spacing-xs);">
                        <div class="contact-request-contact" style="font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">
                            ${request.name ? `${request.name} ` : ""}<span style="font-weight: var(--font-weight-normal); color: var(--color-text-secondary);">(${request.email || "Email inconnu"})</span>
                        </div>
                        <span style="display: inline-block; padding: 2px 8px; border-radius: var(--radius-sm); background: ${request.status === "new" ? "rgba(34, 197, 94, 0.2)" : request.status === "read" ? "rgba(251, 191, 36, 0.2)" : "rgba(156, 163, 175, 0.2)"}; color: ${request.status === "new" ? "#22c55e" : request.status === "read" ? "#f59e0b" : "#6b7280"}; font-weight: var(--font-weight-medium); font-size: 0.8125em;">${statusLabel}</span>
                        <span style="display: inline-block; padding: 2px 8px; border-radius: var(--radius-sm); background: rgba(59, 130, 246, 0.2); color: var(--color-accent); font-weight: var(--font-weight-medium); font-size: 0.8125em;">${topicLabel}</span>
                    </div>
                    <div class="contact-request-meta" style="display: flex; gap: var(--spacing-md); flex-wrap: wrap; font-size: 0.875em; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs);">
                        ${request.page ? `<span>Page: ${request.page}</span>` : ""}
                        <span>${createdDate} à ${createdTime}</span>
                    </div>
                    ${request.message ? `<div class="contact-request-message" style="font-size: 0.875em; color: var(--color-text-secondary); margin-top: var(--spacing-xs); padding: var(--spacing-sm); background: rgba(31, 42, 68, 0.5); border-radius: var(--radius-sm); white-space: pre-wrap;">${request.message.length > 200 ? request.message.substring(0, 200) + "..." : request.message}</div>` : ""}
                </div>
                <div class="contact-request-actions" style="display: flex; gap: var(--spacing-sm); margin-left: var(--spacing-md);">
                    ${
                      request.status === "new"
                        ? `<button class="btn btn-success btn-mark-read" data-request-id="${request.id}" style="font-size: 0.875em;">Marquer lu</button>`
                        : request.status === "read"
                          ? `<button class="btn btn-secondary btn-close-request" data-request-id="${request.id}" style="font-size: 0.875em;">Fermer</button>`
                          : `<button class="btn btn-secondary btn-reopen-request" data-request-id="${request.id}" style="font-size: 0.875em;">Rouvrir</button>`
                    }
                    <button class="btn btn-danger btn-delete-request" data-request-id="${request.id}" style="font-size: 0.875em;">Supprimer</button>
                </div>
            </div>
        `;
    })
    .join("");
}

/**
 * ADDED: Rend la liste des logs utilisateurs dans l'admin
 */
function renderAdminUsersLogsList() {
  // Guard pour protéger la home
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) return;

  const list = document.getElementById("adminUsersLogsList");
  if (!list) return;

  const logs = getAuthLogs();

  // Trier par date décroissante (plus récent en premier)
  logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (logs.length === 0) {
    list.innerHTML = '<div class="empty-state">Aucun log utilisateur</div>';
    return;
  }

  const typeLabels = {
    signup: "Nouvel utilisateur",
    login: "Connexion",
  };

  list.innerHTML = logs
    .map((log) => {
      const typeLabel = typeLabels[log.type] || log.type;
      const createdDate = new Date(log.createdAt).toLocaleDateString("fr-FR");
      const createdTime = new Date(log.createdAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return `
            <div class="user-log-item" style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-md); background: rgba(31, 42, 68, 0.3); border: 1px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: var(--spacing-sm); transition: all var(--transition-base);">
                <div class="user-log-info">
                    <div class="user-log-message" style="font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">
                        ${typeLabel}: ${log.pseudo}
                    </div>
                    <div class="user-log-details" style="display: flex; gap: var(--spacing-md); flex-wrap: wrap; font-size: 0.875em; color: var(--color-text-secondary); margin-top: var(--spacing-xs);">
                        <span>${log.email}</span>
                        <span>${createdDate} à ${createdTime}</span>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

/**
 * ADDED: Rend la liste des tests dans l'admin
 */
function renderAdminTestsList() {
  // Guard pour protéger la home
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) return;

  const list = document.getElementById("adminTestsList");
  if (!list) return;

  const tests = getTestsData();
  const games = getGamesData();

  if (tests.length === 0) {
    list.innerHTML = '<div class="empty-state">Aucun test</div>';
    return;
  }

  list.innerHTML = tests
    .map((test) => {
      const game = test.gameId ? games.find((g) => g.id === test.gameId) : null;
      const gameName = game ? game.title : test.gameTitle || "";
      const scoreText = test.score ? `${test.score.toFixed(1)}/10` : "N/A";

      return `
            <div class="test-item" data-test-id="${test.id}">
                <div class="test-item-info">
                    <div class="test-item-title">${test.title || "Sans titre"}</div>
                    <div class="test-item-meta">
                        <span class="test-score-badge">${scoreText}</span>
                        ${gameName ? `<span>Jeu: ${gameName}</span>` : ""}
                        ${test.publishedAt ? `<span>Date: ${new Date(test.publishedAt).toLocaleDateString("fr-FR")}</span>` : ""}
                    </div>
                </div>
                <div class="test-item-actions">
                    <button class="btn btn-secondary btn-edit-test" data-test-id="${test.id}">Modifier</button>
                    <button class="btn btn-danger btn-delete-test" data-test-id="${test.id}">Supprimer</button>
                </div>
            </div>
        `;
    })
    .join("");

  // ADDED: Appliquer le fallback aux images de cette liste
  attachImageFallback(list);
}

/**
 * ADDED: Met à jour le preview de l'image cover (version robuste avec fallback)
 * Zone admin uniquement - ne s'exécute que sur la page admin
 */
function updateCoverPreview(url, { silent = true } = {}) {
  // ADDED: Guard admin - ne s'exécute que sur la page admin
  if (document.body?.dataset?.page !== "admin") return;

  const previewImg = document.getElementById("coverPreviewImg");
  const previewPlaceholder = document.getElementById("coverPreviewPlaceholder");
  const coverInput = document.getElementById("game-cover");
  const coverError = document.getElementById("error-cover");

  if (!previewImg || !previewPlaceholder) return;

  const urlTrimmed = toText(url);

  // Si URL vide, cacher l'image et afficher le placeholder
  if (!urlTrimmed) {
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "block";
    previewPlaceholder.textContent = "Aperçu indisponible";
    if (coverInput) coverInput.classList.remove("invalid", "is-invalid");
    if (coverError) coverError.textContent = "";
    return;
  }

  // ADDED: Vérification simple URL http/https (warning, pas bloquant)
  const urlPattern = /^https?:\/\//i;
  if (!urlPattern.test(urlTrimmed)) {
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "block";
    previewPlaceholder.textContent = "URL invalide";
    if (coverInput) coverInput.classList.add("invalid", "is-invalid");
    if (coverError)
      coverError.textContent = "L'URL doit commencer par http:// ou https://";
    return;
  }

  // Charger l'image
  const img = new Image();

  img.onload = function () {
    // ADDED: Image chargée avec succès
    try {
      previewImg.src = urlTrimmed;
      previewImg.style.display = "block";
      previewPlaceholder.style.display = "none";
      if (coverInput) coverInput.classList.remove("invalid", "is-invalid");
      if (coverError) coverError.textContent = "";
    } catch (e) {
      // ADDED: Fallback silencieux en cas d'erreur (zéro console error)
      previewImg.style.display = "none";
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Erreur d'affichage";
    }
  };

  img.onerror = function () {
    // ADDED: Image introuvable ou invalide (fallback robuste)
    try {
      previewImg.style.display = "none";
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Image introuvable";
      // ADDED: Marquer le champ en invalid avec erreur inline (warning, pas bloquant)
      if (coverInput) coverInput.classList.add("invalid", "is-invalid");
      if (coverError)
        coverError.textContent = "Image introuvable ou URL invalide";
    } catch (e) {
      // ADDED: Fallback silencieux (zéro console error)
      previewImg.style.display = "none";
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Erreur";
    }
  };

  // ADDED: Déclencher le chargement (avec gestion d'erreur silencieuse)
  try {
    img.src = urlTrimmed;
  } catch (e) {
    // ADDED: Fallback si l'URL est invalide (zéro console error)
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "block";
    previewPlaceholder.textContent = "URL invalide";
    if (coverInput) coverInput.classList.add("invalid", "is-invalid");
    if (coverError)
      coverError.textContent = "Image introuvable ou URL invalide";
  }
}

/**
 * Gère la soumission du formulaire
 */
function handleFormSubmit(e) {
  e.preventDefault();

  clearFormErrors();

  const payload = readForm();
  const validation = validateGame(payload);

  if (!validation.ok) {
    showFormErrors(validation.errors);
    return;
  }

  const games = getGamesData();

  if (payload.id) {
    // Mode édition
    updateGame(payload.id, payload);
  } else {
    // Mode création
    createGame(payload);
  }
}

/**
 * ADDED: Crée un nouveau jeu (version durcie - anti-collision)
 */
function createGame(payload) {
  // ADDED: Relire les données à chaque fois (anti-bug état obsolète)
  const games = getGamesData();

  // ADDED: Générer l'ID depuis le titre avec vérification de collision
  const baseSlug = slugify(payload.title);
  if (!baseSlug) {
    console.error("Impossible de générer un slug depuis le titre");
    return;
  }

  const id = generateId(games, baseSlug);

  // ADDED: Vérification finale anti-doublon
  if (games.some((g) => g.id === id)) {
    console.error("Collision d'ID détectée:", id);
    return;
  }

  // ADDED: Créer l'objet jeu complet avec le modèle standardisé
  const newGame = normalizeGame({
    id,
    title: payload.title,
    platforms: payload.platforms || [],
    genres: payload.genres || [],
    status: payload.status || "released",
    releaseDate: payload.releaseDate || "",
    cover: payload.cover || "",
    shortDesc: payload.excerpt || payload.shortDesc || "",
    content: payload.content || "",
    studio: payload.studio,
    modes: payload.modes,
    difficulty: payload.difficulty,
    duration: payload.duration,
    isFeatured: payload.isFeatured || false,
    createdAt: new Date().toISOString(),
  });

  // Ajouter aux jeux
  games.push(newGame);

  // ADDED: Utiliser la fonction centralisée d'écriture
  saveGamesOverride(games);

  // ADDED: Rerender en relisant getGamesData() (pas l'état en mémoire)
  renderAdminGamesList();

  // ADDED: Mise à jour des compteurs admin
  updateAdminSiteCounters();

  // Fermer le modal
  closeGameModal();
}

/**
 * ADDED: Met à jour un jeu existant (version durcie - id jamais modifié)
 */
function updateGame(id, payload) {
  // ADDED: Relire les données à chaque fois (anti-bug état obsolète)
  const games = getGamesData();
  const index = games.findIndex((g) => g.id === id);

  if (index === -1) {
    console.error("Jeu non trouvé:", id);
    return;
  }

  // ADDED: En mode edit, l'id ne change JAMAIS (même si le titre change)
  // Le slug peut être mis à jour si nécessaire, mais l'id reste stable
  const existingGame = games[index];

  // ADDED: Mettre à jour le jeu avec le modèle standardisé (id préservé)
  games[index] = normalizeGame({
    ...existingGame,
    id: existingGame.id, // ADDED: Garantir que l'id ne change jamais
    title: payload.title,
    platforms: payload.platforms || existingGame.platforms || [],
    genres: payload.genres || existingGame.genres || [],
    status: payload.status || existingGame.status || "released",
    releaseDate: payload.releaseDate || existingGame.releaseDate || "",
    cover: payload.cover || existingGame.cover || existingGame.image || "",
    shortDesc:
      payload.excerpt ||
      payload.shortDesc ||
      existingGame.shortDesc ||
      existingGame.excerpt ||
      existingGame.subtitle ||
      "",
    content:
      payload.content || existingGame.content || existingGame.description || "",
    studio: payload.studio !== undefined ? payload.studio : existingGame.studio,
    modes: payload.modes !== undefined ? payload.modes : existingGame.modes,
    difficulty:
      payload.difficulty !== undefined
        ? payload.difficulty
        : existingGame.difficulty,
    duration:
      payload.duration !== undefined ? payload.duration : existingGame.duration,
    isFeatured:
      payload.isFeatured !== undefined
        ? payload.isFeatured
        : existingGame.isFeatured || false,
  });

  // ADDED: Utiliser la fonction centralisée d'écriture
  saveGamesOverride(games);

  // ADDED: Rerender en relisant getGamesData() (pas l'état en mémoire)
  renderAdminGamesList();

  // Fermer le modal
  closeGameModal();
}

/**
 * Édite un jeu (ouvre le modal en mode édition)
 */
function editGame(gameId) {
  const games = getGamesData();
  const game = games.find((g) => g.id === gameId);

  if (!game) {
    console.error("Jeu non trouvé:", gameId);
    return;
  }

  openGameModal("edit", game);
}

/**
 * ADDED: Supprime un jeu (version durcie)
 */
function deleteGame(gameId) {
  // ADDED: Relire les données à chaque fois (anti-bug état obsolète)
  const games = getGamesData();
  const filtered = games.filter((g) => g.id !== gameId);

  if (filtered.length === games.length) {
    console.error("Jeu non trouvé:", gameId);
    return;
  }

  // ADDED: Utiliser la fonction centralisée d'écriture
  saveGamesOverride(filtered);

  // ADDED: Rerender en relisant getGamesData() (pas l'état en mémoire)
  renderAdminGamesList();

  // ADDED: Mise à jour des compteurs admin
  updateAdminSiteCounters();
}

/**
 * Initialise les pages publiques (index, jeux, etc.)
 */
function initPublicPages() {
  // PROTECTION CONTRE INITIALISATIONS MULTIPLES
  if (window.__APP_INIT_DONE__) {
    return;
  }
  window.__APP_INIT_DONE__ = true;
  console.log(
    "[DEBUG] initPublicPages called - pathname:",
    window.location.pathname,
  );

  // Garantir le bloc "Derniers articles" sur toutes les pages publiques
  ensureLatestArticlesBlock();
  // ADDED: Plus besoin de recharger loadedGames, getGamesData() lit toujours à jour
  // (supprimé: loadedGames = loadGames();)

  // ADDED: Initialiser jeux.html avec getGamesData()
  if (window.location.pathname.includes("jeux.html")) {
    initJeuxPage();
    mountPromosWidget(); // Afficher les promos sur toutes les pages
    renderLatestArticlesSidebar(); // Afficher les derniers articles sur toutes les pages
    // SUPPRIMÉ: renderSponsorWidget() - sponsors retirés des pages publiques
    renderPartnershipBlock(); // Bloc partenariat premium
  }

  // Rendre les jeux sur index.html avec filtres et tri appliqués
  const gamesGrid = document.getElementById("gamesGrid");
  if (gamesGrid) {
    applySortAndFilters(); // Applique les filtres (vides) et le tri sauvegardé
  }

  // ADDED: Rendre les articles sur index.html
  renderHomeArticles();

  // ADDED: Initialiser la page article
  if (window.location.pathname.includes("article.html")) {
    renderArticlePage();
  }

  // ADDED: Initialiser la page contact
  if (window.location.pathname.includes("contact.html")) {
    initContactPage();
  }

  // ADDED: Initialiser la page conditions
  if (window.location.pathname.includes("conditions.html")) {
    initConditionsPage();
  }

  // ADDED: Initialiser les pages auth
  if (window.location.pathname.includes("login.html")) {
    initLoginPage();
  }

  if (window.location.pathname.includes("signup.html")) {
    initSignupPage();
  }

  // Afficher les derniers articles et promos sur index.html
  renderLatestArticlesSidebar();
  mountPromosWidget();
  mountPromosWidget();

  // SUPPRIMÉ: renderSponsorWidget() - sponsors retirés des pages publiques

  // FIX SURBRILLANCE SPONSOR: Anti-focus souris DÉFINITIF
  let sponsorFocusHandlerAdded = false;
  if (!sponsorFocusHandlerAdded) {
    // APPROCHE AGRÉSSIVE: PRÉVENIR TOUT FOCUS SUR LES ÉLÉMENTS DU SPONSOR AU CLIC
    const preventSponsorFocus = (e) => {
      const sponsorElement = e.target.closest(".sponsor-card");
      if (!sponsorElement) return;

      // Empêcher complètement le comportement par défaut qui pourrait causer du focus
      e.preventDefault();
      e.stopImmediatePropagation();

      // Forcer le blur immédiat de TOUS les éléments focused dans le sponsor
      const focusedElements = sponsorElement.querySelectorAll(":focus");
      focusedElements.forEach((el) => el.blur());

      // Supprimer temporairement la possibilité de focus sur les éléments du sponsor
      const focusableElements = sponsorElement.querySelectorAll(
        "a, button, input, [tabindex]",
      );
      focusableElements.forEach((el) => {
        el.setAttribute(
          "data-original-tabindex",
          el.getAttribute("tabindex") || "",
        );
        el.setAttribute("tabindex", "-1");
      });

      // Remettre le focus après un court instant
      setTimeout(() => {
        focusableElements.forEach((el) => {
          const original = el.getAttribute("data-original-tabindex");
          if (original === "") {
            el.removeAttribute("tabindex");
          } else {
            el.setAttribute("tabindex", original);
          }
          el.removeAttribute("data-original-tabindex");
        });
      }, 100);
    };

    document.addEventListener("mousedown", preventSponsorFocus, true); // capture phase
    document.addEventListener("touchstart", preventSponsorFocus, true); // capture phase
    document.addEventListener("pointerdown", preventSponsorFocus, true); // capture phase

    sponsorFocusHandlerAdded = true;
  }

  // ADDED: Initialiser les pages de catégories d'articles avec filtres
  if (window.location.pathname.includes("actu.html")) {
    renderArticlesMosaic({
      containerId: "articlesGrid",
      filterFn: (article) =>
        ["actu", "actualite", "actualites", "actualité", "actualités"].includes(
          normalizeCategory(article.category || ""),
        ),
      title: "Actu",
      subtitle: "Les dernières news gaming",
    });
    mountPromosWidget(); // Afficher les promos sur toutes les pages
    renderLatestArticlesSidebar(); // Afficher les derniers articles sur toutes les pages
    // SUPPRIMÉ: renderSponsorWidget() - sponsors retirés des pages publiques
    renderPartnershipBlock(); // Bloc partenariat premium
  } else if (window.location.pathname.includes("tests.html")) {
    renderTestsPage();
    mountPromosWidget(); // Afficher les promos sur toutes les pages
    renderLatestArticlesSidebar(); // Afficher les derniers articles sur toutes les pages
    // SUPPRIMÉ: renderSponsorWidget() - sponsors retirés des pages publiques
    renderPartnershipBlock(); // Bloc partenariat premium
  } else if (window.location.pathname.includes("test.html")) {
    initTestPage();
  } else if (window.location.pathname.includes("guides.html")) {
    console.log("[DEBUG] guides.html detected");
    renderArticlesMosaic({
      containerId: "articlesGrid",
      filterFn: (article) =>
        ["guide", "guides"].includes(normalizeCategory(article.category || "")),
      title: "Guides",
      subtitle: "Astuces et guides complets",
    });
    mountPromosWidget(); // Afficher les promos sur toutes les pages
    renderLatestArticlesSidebar(); // Afficher les derniers articles sur toutes les pages
    // SUPPRIMÉ: renderSponsorWidget() - sponsors retirés des pages publiques
    renderPartnershipBlock(); // Bloc partenariat premium
  } else if (window.location.pathname.includes("bons-plans.html")) {
    debugLog("PAGE", "bons-plans.html detected");
    // Debug: vérifier que hero et filtres sont absents sur bons-plans
    const heroEl = document.querySelector(".page-hero");
    const filtersEl = document.querySelector(".filters-simple");
    console.log(
      "[BONSPLANS] hero hidden:",
      !heroEl,
      "filters hidden:",
      !filtersEl,
    );

    renderBonsPlansPage();
    mountPromosWidget(); // Afficher les promos sur toutes les pages
    renderLatestArticlesSidebar(); // Afficher les derniers articles sur toutes les pages
    // SUPPRIMÉ: renderSponsorWidget() - sponsors retirés des pages publiques
    renderPartnershipBlock(); // Bloc partenariat premium
  }

  if (document.querySelector("#game-page")) {
    renderGamePage();
  }

  // Rendre le bloc partenariat premium (TOUJOURS À LA FIN)
  renderPartnershipBlock();
}

/**
 * ADDED: Initialise la page jeux.html avec getGamesData()
 */
function initJeuxPage() {
  const gamesGrid = document.getElementById("games-grid");
  if (!gamesGrid) return;

  // ADDED: Vider le HTML statique et utiliser getGamesData()
  const games = getGamesData();
  if (!games || !Array.isArray(games) || games.length === 0) {
    gamesGrid.innerHTML = '<div class="empty-state">Aucun jeu disponible</div>';
    return;
  }

  // ADDED: Rendre les jeux dans le conteneur jeux.html (avec pagination)
  renderGames(games, "games-grid", {
    enablePagination: true,
    pageSize: 12,
  });

  // ADDED: Appliquer la vue (favoris ou normale)
  if (typeof window.applyGameView === "function") {
    window.applyGameView();
  }
}

/**
 * ADDED: Rend les articles d'une catégorie spécifique
 */
function renderCategoryArticles(category) {
  // ADDED: Mapping des catégories avec normalisation
  const categoryMapping = {
    actu: ["actu"],
    test: ["test"],
    guide: ["guide"],
    "bons-plans": ["bons-plans", "bon plan", "bons plans"],
  };

  const expectedCategories = categoryMapping[category] || [category];
  const normalizedExpected = expectedCategories.map((c) =>
    normalizeCategory(c),
  );

  // ADDED: Trouver le conteneur (chercher plusieurs IDs possibles)
  let container =
    document.getElementById("articles-list") ||
    document.getElementById("articles-grid") ||
    document.querySelector("main section.welcome");

  if (!container) return;

  const articles = getArticlesData();

  // ADDED: Filtrer par catégorie normalisée
  const filteredArticles = articles.filter((article) => {
    const articleCategory = normalizeCategory(article.category || "");
    return normalizedExpected.includes(articleCategory);
  });

  if (filteredArticles.length === 0) {
    // ADDED: Si pas d'articles, afficher un message dans le conteneur existant
    const welcomeSection = document.querySelector("main section.welcome");
    if (welcomeSection) {
      welcomeSection.innerHTML = `
                <h1 style="font-size: 2.5em; margin-bottom: var(--spacing-md); color: var(--color-text-primary);">${category.toUpperCase()}</h1>
                <p style="font-size: 1.125em; color: var(--color-text-secondary);">Aucun article pour le moment</p>
            `;
    }
    return;
  }

  // ADDED: Trier par date (plus récents en premier)
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    const dateA = a.updatedAt || a.createdAt || "";
    const dateB = b.updatedAt || b.createdAt || "";
    return dateB.localeCompare(dateA);
  });

  // ADDED: Créer ou utiliser un conteneur pour les articles
  let articlesContainer =
    document.getElementById("articles-list") ||
    document.getElementById("articles-grid");
  if (!articlesContainer) {
    // ADDED: Créer un conteneur après le welcome
    const welcomeSection = document.querySelector("main section.welcome");
    if (welcomeSection) {
      articlesContainer = document.createElement("div");
      articlesContainer.id = "articles-list";
      articlesContainer.className = "articles-list";
      articlesContainer.style.cssText =
        "display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--spacing-lg); margin-top: var(--spacing-2xl);";
      welcomeSection.after(articlesContainer);
    } else {
      return;
    }
  }

  // ADDED: Rendre les articles
  articlesContainer.innerHTML = sortedArticles
    .map((article) => {
      // ADDED: Utiliser getArticleUrl() pour construire l'URL
      const href = getArticleUrl(article);
      const title = article.title || "Sans titre";
      const excerpt = article.excerpt || "";

      // ADDED: Gérer l'image (cover ou placeholder)
      let imageHtml = "";
      if (article.cover && article.cover.trim()) {
        imageHtml = `<div class="article-image" style="background-image: url('${article.cover}'); background-size: cover; background-position: center; border-radius: var(--radius-md); height: 200px; margin-bottom: var(--spacing-md);"></div>`;
      } else {
        imageHtml = `<div class="article-image placeholder-image" style="height: 200px; margin-bottom: var(--spacing-md); border-radius: var(--radius-md);"></div>`;
      }

      return `
            <article class="article-card" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-lg); transition: all var(--transition-base);">
                <a href="${href}" style="text-decoration: none; color: inherit; display: block;">
                    ${imageHtml}
                    <div class="article-content">
                        <h3 style="font-size: 1.25em; margin-bottom: var(--spacing-sm); color: var(--color-text-primary); font-weight: var(--font-weight-semibold);">${escapeHtml(title)}</h3>
                        <p style="color: var(--color-text-secondary); line-height: 1.6;">${escapeHtml(excerpt)}</p>
                    </div>
                </a>
            </article>
        `;
    })
    .join("");
}

/**
 * ADDED: Rend un article en card (helper réutilisable)
 */
function renderArticleCard(article) {
  // ADDED: Utiliser getArticleUrl() pour construire l'URL
  const href = getArticleUrl(article);

  const title = article.title || "Sans titre";
  const excerpt = article.excerpt || "";

  // ADDED: Gérer l'image (cover ou placeholder)
  let imageHtml = "";
  if (
    article.cover &&
    article.cover.trim() &&
    (article.cover.startsWith("http://") ||
      article.cover.startsWith("https://"))
  ) {
    imageHtml = `<div class="article-image" style="background-image: url('${escapeHtml(article.cover)}'); background-size: cover; background-position: center;"></div>`;
  } else {
    imageHtml = `<div class="article-image placeholder-image"></div>`;
  }

  return `
        <article class="article-card">
            <a href="${href}">
                ${imageHtml}
                <div class="article-content">
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(excerpt)}</p>
                </div>
            </a>
        </article>
    `;
}

/**
 * ADDED: Rend les derniers articles dans la sidebar (10 plus récents)
 */
function renderLatestArticlesSidebar({
  containerId = "latestArticlesSidebar",
  limit = 10,
} = {}) {
  // EXCLURE les pages de connexion/inscription : pas de sidebar articles sur login.html et signup.html
  // EXCLURE equipe.html : pas de sidebar articles sur la page équipe
  // EXCLURE membre.html : pas de sidebar articles sur les pages profil auteur
  if (
    window.location.pathname.includes("login.html") ||
    window.location.pathname.includes("signup.html") ||
    window.location.pathname.includes("equipe.html") ||
    window.location.pathname.includes("membre.html")
  ) {
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) return; // Guard : ne s'exécute que si le conteneur existe

  try {
    const articles =
      typeof getArticlesData === "function"
        ? getArticlesData()
        : window.ARTICLES || [];

    if (!articles || articles.length === 0) {
      container.innerHTML =
        '<p style="color: var(--color-text-secondary); font-size: 0.875em; text-align: center; padding: var(--spacing-md);">Aucun article disponible</p>';
      return;
    }

    // Trier par date la plus récente (updatedAt > createdAt > id)
    const sorted = [...articles].sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt || "";
      const dateB = b.updatedAt || b.createdAt || "";

      // Si les deux ont des dates, comparer les dates
      if (dateA && dateB) {
        const comparison = dateB.localeCompare(dateA);
        if (comparison !== 0) return comparison;
      }

      // Si une seule a une date, celle avec date vient en premier
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;

      // Fallback sur id (plus récent en premier, en assumant que les IDs sont séquentiels)
      const idA = a.id || "";
      const idB = b.id || "";
      return idB.localeCompare(idA);
    });

    // Prendre les 10 premiers
    const latestArticles = sorted.slice(0, limit);

    // Générer les mini-cards
    container.innerHTML = latestArticles
      .map((article) => {
        const href = getArticleUrl
          ? getArticleUrl(article)
          : `article.html?id=${article.id}`;
        const title = article.title || "Sans titre";
        const excerpt = article.excerpt || "";

        // Gérer l'image (couverture ou placeholder)
        let imageStyle = "";
        if (
          article.cover &&
          article.cover.trim() &&
          (article.cover.startsWith("http://") ||
            article.cover.startsWith("https://"))
        ) {
          imageStyle = `background-image: url('${escapeHtml(article.cover)}');`;
        }

        // Formater la date pour l'affichage
        let dateDisplay = "";
        if (article.updatedAt || article.createdAt) {
          const date = new Date(article.updatedAt || article.createdAt);
          if (!isNaN(date.getTime())) {
            dateDisplay = date.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            });
          }
        }

        return `
                <a href="${href}" class="sidebar-article-item">
                    <div class="sidebar-article-item__image" style="${imageStyle}"></div>
                    <div class="sidebar-article-item__content">
                        <h4 class="sidebar-article-item__title">${escapeHtml(title)}</h4>
                        ${dateDisplay ? `<small class="sidebar-article-item__meta">${dateDisplay}</small>` : ""}
                    </div>
                </a>
            `;
      })
      .join("");

    // Appliquer fallbacks aux images de fond CSS après rendu
    setTimeout(() => applyImageFallbacks(container), 100);
  } catch (error) {
    console.error("[renderLatestArticlesSidebar] Error:", error);
    container.innerHTML =
      '<p style="color: var(--color-text-secondary); font-size: 0.875em; text-align: center; padding: var(--spacing-md);">Aucun article pour le moment.</p>';
  }
}

/**
 * ADDED: Rend les articles sur la page d'accueil (fonction publique SAFE)
 */
function renderHomeArticles() {
  const grid = document.getElementById("homeArticlesGrid");
  if (!grid) return; // Guard : ne s'exécute que si le conteneur existe

  try {
    const articles = getArticlesData();

    if (!articles || articles.length === 0) {
      // ADDED: Afficher 3 cartes placeholder si aucun article (sidebar jamais vide)
      grid.innerHTML = `
                <article class="article-card">
                    <a href="#">
                        <div class="article-image placeholder-image"></div>
                        <div class="article-content">
                            <h3>Aucun article pour le moment</h3>
                            <p>Ajoute un article depuis l'admin</p>
                        </div>
                    </a>
                </article>
                <article class="article-card">
                    <a href="#">
                        <div class="article-image placeholder-image"></div>
                        <div class="article-content">
                            <h3>Articles à venir</h3>
                            <p>Les nouveaux articles apparaîtront ici</p>
                        </div>
                    </a>
                </article>
                <article class="article-card">
                    <a href="#">
                        <div class="article-image placeholder-image"></div>
                        <div class="article-content">
                            <h3>Restez connecté</h3>
                            <p>Revenez bientôt pour plus de contenu</p>
                        </div>
                    </a>
                </article>
            `;
      return;
    }

    // ADDED: Trier par updatedAt ou createdAt (desc)
    const sorted = [...articles].sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt || "";
      const dateB = b.updatedAt || b.createdAt || "";
      return dateB.localeCompare(dateA);
    });

    // ADDED: Prendre les 6 premiers
    const topArticles = sorted.slice(0, 6);

    // ADDED: Générer les cards HTML
    grid.innerHTML = topArticles
      .map((article) => {
        // ADDED: Utiliser getArticleUrl() pour construire l'URL
        const href = getArticleUrl(article);

        const title = article.title || "Sans titre";
        const excerpt = article.excerpt || "";

        // ADDED: Gérer l'image (cover ou placeholder)
        let imageHtml = "";
        if (article.cover && article.cover.trim()) {
          // ADDED: Utiliser background-image pour la cover
          imageHtml = `<div class="article-image" style="background-image: url('${escapeHtml(article.cover)}'); background-size: cover; background-position: center;"></div>`;
        } else {
          // ADDED: Placeholder comme avant
          imageHtml = `<div class="article-image placeholder-image"></div>`;
        }

        return `
                <article class="article-card">
                    <a href="${href}">
                        ${imageHtml}
                        <div class="article-content">
                            <h3>${escapeHtml(title)}</h3>
                            <p>${escapeHtml(excerpt)}</p>
                        </div>
                    </a>
                </article>
            `;
      })
      .join("");
  } catch (e) {
    // ADDED: Fallback silencieux (zéro console error)
    grid.innerHTML = `
            <article class="article-card">
                <a href="#">
                    <div class="article-image placeholder-image"></div>
                    <div class="article-content">
                        <h3>Erreur de chargement</h3>
                        <p>Impossible de charger les articles</p>
                    </div>
                </a>
            </article>
        `;
  }
}

/**
 * ADDED: Rend le layout éditorial dans le main (Hero + À la une + Derniers articles)
 */
function renderHomeArticlesEditorial(container) {
  if (!container) return;

  try {
    const articles = getArticlesData();

    if (!articles || articles.length === 0) {
      container.innerHTML =
        '<p style="color: var(--color-text-secondary);">Aucun article disponible.</p>';
      return;
    }

    // ADDED: Trier par date (desc) ou id (desc) si pas de date
    const sorted = [...articles].sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt || a.date || "";
      const dateB = b.updatedAt || b.createdAt || b.date || "";
      if (dateA && dateB) {
        return dateB.localeCompare(dateA);
      }
      // Fallback sur id si pas de date
      const idA = a.id || "";
      const idB = b.id || "";
      return idB.localeCompare(idA);
    });

    // ADDED: Séparer featured et non-featured
    const featuredList = sorted.filter((a) => a.featured === true);
    const nonFeaturedList = sorted.filter((a) => a.featured !== true);

    // ADDED: Hero = featured le plus récent (ou fallback dernier article)
    const hero =
      featuredList.length > 0
        ? featuredList[0]
        : sorted.length > 0
          ? sorted[0]
          : null;

    // ADDED: À la une = 2 à 4 articles featured (exclure le Hero)
    const aLaUne = featuredList.filter((a) => a.id !== hero?.id).slice(0, 4);

    // ADDED: Derniers articles = non-featured + featured restants (exclure Hero et À la une)
    const heroId = hero?.id;
    const aLaUneIds = new Set(aLaUne.map((a) => a.id));
    const derniers = sorted.filter(
      (a) => a.id !== heroId && !aLaUneIds.has(a.id),
    );

    // ADDED: Construire le HTML avec layout éditorial
    let html = "";

    // ADDED: Hero (si existe)
    if (hero) {
      // ADDED: Utiliser getArticleUrl() pour construire l'URL
      const heroHref = getArticleUrl(hero);
      const heroTitle = hero.title || "Sans titre";
      const heroExcerpt = hero.excerpt || "";

      let heroImageHtml = "";
      if (
        hero.cover &&
        hero.cover.trim() &&
        (hero.cover.startsWith("http://") || hero.cover.startsWith("https://"))
      ) {
        heroImageHtml = `<div class="article-hero-image" style="background-image: url('${escapeHtml(hero.cover)}'); background-size: cover; background-position: center; width: 100%; height: 400px; border-radius: var(--radius-lg); margin-bottom: var(--spacing-lg);"></div>`;
      } else {
        heroImageHtml = `<div class="article-hero-image placeholder-image" style="width: 100%; height: 400px; border-radius: var(--radius-lg); margin-bottom: var(--spacing-lg);"></div>`;
      }

      html += `
                <div class="article-hero" style="margin-bottom: var(--spacing-2xl);">
                    <a href="${heroHref}" style="text-decoration: none; color: inherit; display: block;">
                        ${heroImageHtml}
                        <h2 style="font-size: 2em; margin-bottom: var(--spacing-md); color: var(--color-text-primary);">${escapeHtml(heroTitle)}</h2>
                        ${heroExcerpt ? `<p style="font-size: 1.125em; color: var(--color-text-secondary); margin-bottom: var(--spacing-lg); line-height: 1.6;">${escapeHtml(heroExcerpt)}</p>` : ""}
                        <a href="${heroHref}" class="btn btn-primary" style="display: inline-block;">Lire</a>
                    </a>
                </div>
            `;
    }

    // ADDED: Section "À la une" (si articles featured)
    if (aLaUne.length > 0) {
      html += `
                <div style="margin-bottom: var(--spacing-2xl);">
                    <h2 style="font-size: 1.5em; margin-bottom: var(--spacing-lg); color: var(--color-text-primary);">À la une</h2>
                    <div class="articles-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-lg);">
                        ${aLaUne.map((article) => renderArticleCard(article)).join("")}
                    </div>
                </div>
            `;
    }

    // ADDED: Section "Derniers articles" (si articles restants)
    if (derniers.length > 0) {
      html += `
                <div>
                    <h2 style="font-size: 1.5em; margin-bottom: var(--spacing-lg); color: var(--color-text-primary);">Derniers articles</h2>
                    <div class="articles-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-lg);">
                        ${derniers
                          .slice(0, 6)
                          .map((article) => renderArticleCard(article))
                          .join("")}
                    </div>
                </div>
            `;
    }

    container.innerHTML = html;
  } catch (e) {
    // ADDED: Fallback silencieux (zéro console error)
    container.innerHTML =
      '<p style="color: var(--color-text-secondary);">Erreur de chargement des articles.</p>';
  }
}

/**
 * ADDED: Rend les articles récents dans la sidebar (fallback)
 */
function renderHomeArticlesSidebar(grid) {
  if (!grid) return;

  try {
    const articles = getArticlesData();

    if (!articles || articles.length === 0) {
      grid.innerHTML = `
                <article class="article-card">
                    <a href="#">
                        <div class="article-image placeholder-image"></div>
                        <div class="article-content">
                            <h3>Aucun article pour le moment</h3>
                            <p>Ajoute un article depuis l'admin</p>
                        </div>
                    </a>
                </article>
            `;
      return;
    }

    // ADDED: Trier par date (desc) ou id (desc) si pas de date
    const sorted = [...articles].sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt || a.date || "";
      const dateB = b.updatedAt || b.createdAt || b.date || "";
      if (dateA && dateB) {
        return dateB.localeCompare(dateA);
      }
      const idA = a.id || "";
      const idB = b.id || "";
      return idB.localeCompare(idA);
    });

    // ADDED: Prendre les 6 premiers pour la sidebar
    const topArticles = sorted.slice(0, 6);

    // ADDED: Générer les cards HTML
    grid.innerHTML = topArticles
      .map((article) => renderArticleCard(article))
      .join("");
  } catch (e) {
    // ADDED: Fallback silencieux (zéro console error)
    grid.innerHTML = `
            <article class="article-card">
                <a href="#">
                    <div class="article-image placeholder-image"></div>
                    <div class="article-content">
                        <h3>Erreur de chargement</h3>
                        <p>Impossible de charger les articles</p>
                    </div>
                </a>
            </article>
        `;
  }
}

/**
 * ADDED: Vérifie si un article est lié à un jeu
 */
function isArticleLinkedToGame(article, game) {
  if (!article || !game) return false;

  // ADDED: Priorité 1: linkedGameId === game.id (stringify pour comparaison robuste)
  if (
    article.linkedGameId &&
    String(article.linkedGameId) === String(game.id)
  ) {
    return true;
  }

  // ADDED: Priorité 2: relatedGameId === game.id (champ utilisé dans data.js)
  if (
    article.relatedGameId &&
    String(article.relatedGameId) === String(game.id)
  ) {
    return true;
  }

  // ADDED: Priorité 3: gameId === game.id (fallback si existant)
  if (article.gameId && String(article.gameId) === String(game.id)) {
    return true;
  }

  // ADDED: Priorité 4: linkedGameTitle === game.title (normalisé)
  if (article.linkedGameTitle && game.title) {
    const normalizedArticleTitle = normalizeCategory(article.linkedGameTitle);
    const normalizedGameTitle = normalizeCategory(game.title);
    if (normalizedArticleTitle === normalizedGameTitle) {
      return true;
    }
  }

  return false;
}

/**
 * ADDED: Rend les articles liés à un jeu
 */
function renderLinkedArticles(game) {
  if (!game || !game.id) return "";

  const articles = getArticlesData();
  if (!articles || !Array.isArray(articles)) return "";

  // ADDED: Filtrer les articles liés au jeu
  const linkedArticles = articles.filter((article) =>
    isArticleLinkedToGame(article, game),
  );

  // ADDED: Trier par date (desc) ou id (desc) si pas de date
  const sortedArticles = [...linkedArticles].sort((a, b) => {
    const dateA = a.updatedAt || a.createdAt || a.date || "";
    const dateB = b.updatedAt || b.createdAt || b.date || "";
    if (dateA && dateB) {
      return dateB.localeCompare(dateA);
    }
    // Fallback sur id si pas de date
    const idA = a.id || "";
    const idB = b.id || "";
    return idB.localeCompare(idA);
  });

  // ADDED: Si aucun article lié, afficher état vide premium
  if (sortedArticles.length === 0) {
    return `
            <div class="game-related-section" style="margin-top: var(--spacing-2xl); padding-top: var(--spacing-2xl); border-top: 1px solid var(--color-border);">
                <h3 style="font-size: 1.5em; margin-bottom: var(--spacing-lg); color: var(--color-text-primary);">Articles sur ce jeu</h3>
                <div class="game-related-empty">
                    <div class="game-related-empty__icon">📝</div>
                    <h4 class="game-related-empty__title">Aucun article pour le moment</h4>
                    <p class="game-related-empty__text">Les articles sur ce jeu apparaîtront ici dès qu'ils seront publiés.</p>
                    <div class="game-related-empty__actions">
                        <a href="actu.html" class="btn btn-secondary">Voir tous les articles</a>
                        <a href="tests.html" class="btn btn-outline">Voir les tests</a>
                    </div>
                </div>
            </div>
        `;
  }

  // ADDED: Rendre la grille d'articles (même style que home)
  const articlesHtml = sortedArticles
    .map((article) => {
      // ADDED: Utiliser getArticleUrl() pour construire l'URL
      const href = getArticleUrl(article);
      const title = article.title || "Sans titre";
      const excerpt = article.excerpt || "";
      const category = article.category || "";

      // ADDED: Gérer l'image (cover ou placeholder)
      let imageHtml = "";
      if (
        article.cover &&
        article.cover.trim() &&
        (article.cover.startsWith("http://") ||
          article.cover.startsWith("https://"))
      ) {
        imageHtml = `<div class="article-image" style="background-image: url('${escapeHtml(article.cover)}'); background-size: cover; background-position: center;"></div>`;
      } else {
        imageHtml = `<div class="article-image placeholder-image"></div>`;
      }

      return `
            <article class="game-related-card article-card">
                <a href="${href}">
                    ${imageHtml}
                    <div class="article-content">
                        ${category ? `<span class="game-related-badge">${escapeHtml(category)}</span>` : ""}
                        <h4 class="game-related-title">${escapeHtml(title)}</h4>
                        ${excerpt ? `<p class="game-related-excerpt">${escapeHtml(excerpt)}</p>` : ""}
                    </div>
                </a>
            </article>
        `;
    })
    .join("");

  return `
        <div id="related-articles-section" class="section-block game-related-section" style="margin-top: var(--spacing-2xl); padding-top: var(--spacing-2xl); border-top: 1px solid var(--color-border);">
            <h3 style="font-size: 1.5em; margin-bottom: var(--spacing-lg); color: var(--color-text-primary);">Articles sur ce jeu</h3>
            <div id="related-articles-grid" class="related-articles-grid content-grid">
                ${articlesHtml}
            </div>
        </div>
    `;
}

// ============================================
// UTILITAIRES PANELS PREMIUM
// ============================================

/**
 * Garantit qu'un bloc "Derniers articles" existe sur la page
 * Injection robuste avec fallbacks multiples
 */
function ensureLatestArticlesBlock() {
  // 1️⃣ IDEMPOTENTE : vérifier si déjà injecté
  if (document.getElementById("latestArticlesBlock")) {
    return;
  }

  // 2️⃣ GARDE-FOU : ne pas injecter sur contact.html, conditions.html, login.html, signup.html, equipe.html et membre.html
  if (
    window.location.pathname.includes("contact.html") ||
    window.location.pathname.includes("conditions.html") ||
    window.location.pathname.includes("login.html") ||
    window.location.pathname.includes("signup.html") ||
    window.location.pathname.includes("equipe.html") ||
    window.location.pathname.includes("membre.html")
  ) {
    return;
  }

  // Créer le bloc avec la structure OBLIGATOIRE
  const block = document.createElement("aside");
  block.id = "latestArticlesBlock";
  block.className = "panel latest-articles";
  block.innerHTML = `
        <h3>Derniers articles</h3>
        <div class="latest-articles-list" id="latestArticlesSidebar">
            <!-- Chargé dynamiquement -->
        </div>
    `;

  // 2️⃣ TENTER LES SLOTS DANS CET ORDRE STRICT
  const containers = [
    document.getElementById("latestArticlesSlot"), // 1. Slot dédié
    document.querySelector(".page-sidebar-left"), // 2. Colonne gauche
    document.querySelector(".sidebar-left"), // 3. Sidebar left
    document.querySelector(".layout-left"), // 4. Layout left
    document.querySelector('.container, main, [role="main"]'), // 5. Container principal
    document.body, // 6. Body (dernier recours)
  ];

  for (const container of containers) {
    if (container) {
      // Utiliser appendChild UNIQUEMENT (pas insertBefore dangereux)
      container.appendChild(block);
      return; // Injection réussie, sortir
    }
  }
}

/**
 * Rend une mosaïque d'articles dans un panel premium
 * @param {Object} options - Options de configuration
 * @param {string} options.containerId - ID du container central
 * @param {Function} options.filterFn - Fonction de filtrage des articles
 * @param {string} options.title - Titre du panel
 * @param {string} options.subtitle - Sous-titre optionnel
 */
function renderArticlesMosaic({ containerId, filterFn, title, subtitle }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    // Récupérer et filtrer les articles
    const allArticles = getArticlesData();
    const filteredArticles = filterFn
      ? allArticles.filter(filterFn)
      : allArticles;

    // Trier par date (plus récent en premier)
    const sortedArticles = [...filteredArticles].sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt || "";
      const dateB = b.updatedAt || b.createdAt || "";
      if (dateA && dateB) {
        return dateB.localeCompare(dateA);
      }
      // Fallback sur id
      const idA = a.id || "";
      const idB = b.id || "";
      return idB.localeCompare(idA);
    });

    // Fonction pour rendre un article individuel
    function renderArticleItem(article) {
      const href = getArticleUrl
        ? getArticleUrl(article)
        : `article.html?id=${article.id}`;
      const category = article.category || "";
      const imageHtml =
        article.cover &&
        article.cover.trim() &&
        article.cover.startsWith("http")
          ? `<div class="article-image" style="background-image: url('${escapeHtml(article.cover)}');"></div>`
          : `<div class="article-image placeholder-image"></div>`;

      return `
                <article class="article-card">
                    <a href="${href}">
                        ${imageHtml}
                        <div class="article-content">
                            ${category ? `<span class="article-badge">${escapeHtml(category)}</span>` : ""}
                            <h3 class="article-title">${escapeHtml(article.title || "Sans titre")}</h3>
                            ${article.excerpt ? `<p class="article-excerpt">${escapeHtml(article.excerpt)}</p>` : ""}
                        </div>
                    </a>
                </article>
            `;
    }

    // Wrapper premium pour la grille (comme renderGames)
    ensurePremiumPanel(container, {});

    // Utiliser la pagination comme pour les jeux
    if (sortedArticles.length > 0) {
      // Trouver ou créer le conteneur pagination
      let pagerEl = container.nextElementSibling;
      if (!pagerEl || !pagerEl.classList.contains("pagination")) {
        pagerEl = document.createElement("div");
        pagerEl.className = "pagination";
        container.parentNode.insertBefore(pagerEl, container.nextSibling);
      }

      const pagination = initGridPagination({
        gridEl: container,
        pagerEl: pagerEl,
        items: sortedArticles,
        pageSize: 12,
        renderItem: renderArticleItem,
        key: `articles-${containerId}`, // Clé unique par section d'articles
      });

      // Appliquer fallbacks aux images après rendu initial
      setTimeout(() => applyImageFallbacks(container), 100);

      return pagination;
    } else {
      // Aucun article : afficher le message vide
      container.innerHTML = `
                <div class="articles-empty">
                    <p>Aucun article disponible pour le moment.</p>
                </div>
            `;
    }
  } catch (error) {
    console.error("[renderArticlesMosaic] Error:", error);
    container.innerHTML =
      '<p style="color: var(--color-error); text-align: center; padding: var(--spacing-xl);">Erreur de chargement des articles</p>';
  }
}

// ============================================
// FOOTER GLOBAL
// ============================================

/**
 * Injecte le footer global sur toutes les pages (si aucun footer existant)
 */
function injectGlobalFooter() {
  // EXCLURE l'admin et les pages auth : pas de footer sur admin.html, login.html, signup.html
  if (
    document.body?.dataset?.page === "admin" ||
    window.location.pathname.includes("login.html") ||
    window.location.pathname.includes("signup.html")
  ) {
    return;
  }

  // Vérifier si un footer existe déjà (éviter duplication)
  if (document.querySelector("footer.site-footer")) {
    return;
  }

  // Créer le footer
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
        <div class="footer-content">
            <div class="footer-left">
                <span class="footer-brand">LE MONT DE LERMITE</span>
            </div>
            <div class="footer-right">
                <a href="contact.html" class="footer-link">Contact</a>
                <a href="conditions.html" class="footer-link">Conditions</a>
            </div>
        </div>
    `;

  // Injecter à la fin du body
  document.body.appendChild(footer);
}

// ============================================
// UTILITAIRES PANELS PREMIUM
// ============================================

/**
 * Garantit qu'un container de grille est wrappé dans un panel premium
 * @param {HTMLElement} containerEl - Le container de grille à wrapper
 * @param {Object} opts - Options pour le panel
 * @param {string} opts.title - Titre optionnel du panel
 * @param {string} opts.subtitle - Sous-titre optionnel du panel
 */
function ensurePremiumPanel(containerEl, opts = {}) {
  if (!containerEl) return null;

  // Guard : si déjà dans un panel premium, retourner le panel existant
  const existingPanel = containerEl.closest(".premium-panel");
  if (existingPanel) {
    return existingPanel;
  }

  // Guard : si containerEl est déjà dans un body de panel (déjà déplacé)
  if (containerEl.parentElement?.classList.contains("premium-panel__body")) {
    return containerEl.parentElement.parentElement;
  }

  // Vérifier que containerEl a un parent
  const parent = containerEl.parentNode;
  if (!parent) return null;

  // Capturer la position originale AVANT tout déplacement
  const next = containerEl.nextSibling;

  // Créer le panel premium
  const panelEl = document.createElement("div");
  panelEl.className = "premium-panel";

  // Créer le body du panel
  const bodyEl = document.createElement("div");
  bodyEl.className = "premium-panel__body";

  // Ajouter le header si titre fourni
  if (opts.title) {
    const headerEl = document.createElement("div");
    headerEl.className = "premium-panel__header";

    const titleEl = document.createElement("h3");
    titleEl.textContent = opts.title;

    if (opts.subtitle) {
      const subtitleEl = document.createElement("p");
      subtitleEl.textContent = opts.subtitle;
      headerEl.appendChild(titleEl);
      headerEl.appendChild(subtitleEl);
    } else {
      headerEl.appendChild(titleEl);
    }

    panelEl.appendChild(headerEl);
  }

  // Ajouter le body au panel
  panelEl.appendChild(bodyEl);

  // Insérer le panel à l'emplacement original du container
  if (next) {
    parent.insertBefore(panelEl, next);
  } else {
    parent.appendChild(panelEl);
  }

  // Déplacer le container dans le body (APRÈS avoir inséré le panel)
  bodyEl.appendChild(containerEl);

  return panelEl;
}

// ============================================
// INITIALISATION GLOBALE
// ============================================

/**
 * Initialise l'application selon la page
 */
function initApp() {
  // Détecter la page
  const page = document.body?.dataset?.page || "";

  // Injecter le footer global sur toutes les pages (safe)
  injectGlobalFooter();

  if (page === "admin") {
    // Pour admin, attendre que le DOM soit prêt avant d'initialiser
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        initAdmin();
      });
    } else {
      initAdmin();
    }
  } else {
    initPublicPages();
  }
}

// Appliquer l'initialisation au chargement
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// ============================================
// FALLBACKS POUR IMAGES CASSÉES (404/REDIRECTS)
// ============================================

/**
 * Applique des fallbacks automatiques aux images qui échouent (404/redirects)
 * @param {Element} root - Élément racine à scanner (par défaut document)
 */
function applyImageFallbacks(root = document) {
  // Data-uri SVG simple comme placeholder (évite de créer un fichier)
  const placeholderSrc = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vbiBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==";

  // Trouver toutes les images dans les sections dynamiques
  const images = root.querySelectorAll('img');

  images.forEach(img => {
    // Éviter de traiter plusieurs fois la même image
    if (img.hasAttribute('data-fallback-applied')) return;

    // Vérifier si l'image est dans une section dynamique (cartes, listes)
    const isInDynamicSection = img.closest('.games-grid, .tests-grid, .guides-grid, .articles-grid, .card, .game-card, .test-card, .guide-card, .article-card');

    if (isInDynamicSection) {
      img.addEventListener('error', function() {
        // Ne pas remplacer si c'est déjà le placeholder
        if (img.src !== placeholderSrc) {
          console.warn(`[Image Fallback] Image failed to load: ${img.src}`);
          img.src = placeholderSrc;
          img.classList.add('img-fallback');
          img.alt = img.alt || 'Image non disponible';
        }
      }, { once: true });

      // Marquer comme traité
      img.setAttribute('data-fallback-applied', 'true');
    }
  });
}

// ============================================
// RENDU DYNAMIQUE DE LA PAGE ARTICLE
// ============================================

// Fonction renderArticlePage() obsolète supprimée
// Utilisez la version ci-dessus (ligne ~15952) qui gère correctement contentBlocks

// ============================================
// RENDU DYNAMIQUE DE LA PAGE JEU
// ============================================

function renderGamePage() {
  const gamePage = document.getElementById("game-page");
  if (!gamePage) return;

  // ADDED: Lire les jeux depuis getGamesData() (pas d'accès direct à loadedGames)
  const games = getGamesData();

  // Lire l'ID depuis l'URL
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get("id");

  // Si pas d'ID ou jeu inconnu
  if (!gameId) {
    gamePage.innerHTML = `
            <div class="game-not-found">
                <h1>Jeu introuvable</h1>
                <p>Le jeu demandé n'existe pas ou a été supprimé.</p>
                <a href="index.html" class="btn btn-primary">Retour à l'accueil</a>
            </div>
        `;
    return;
  }

  // ADDED: Chercher le jeu dans games (depuis getGamesData())
  const game = games.find((g) => g.id === gameId);

  if (!game) {
    gamePage.innerHTML = `
            <div class="game-not-found">
                <h1>Jeu introuvable</h1>
                <p>Le jeu demandé n'existe pas ou a été supprimé.</p>
                <a href="index.html" class="btn btn-primary">Retour à l'accueil</a>
            </div>
        `;
    return;
  }

  // Mettre à jour le titre de la page
  document.title = `${game.title} - LE MONT DE LERMITE`;

  // Marquer comme récemment consulté
  markGameAsRecent(gameId);

  // Générer le HTML complet
  // Utiliser directement les plateformes et genres depuis data.js
  const consoleBadges = game.platforms.join(" • ");
  const genreBadges = game.genres.join(" • ");

  // Gradient pour l'image placeholder (par défaut bleu)
  const gradients = {
    blue: "linear-gradient(135deg, #0B1220 0%, #1A2332 50%, #0B1220 100%)",
    purple: "linear-gradient(135deg, #1A0B2E 0%, #2A1B3E 50%, #1A0B2E 100%)",
    orange: "linear-gradient(135deg, #2E1A0B 0%, #3E2A1B 50%, #2E1A0B 100%)",
    green: "linear-gradient(135deg, #0B2E1A 0%, #1B3E2A 50%, #0B2E1A 100%)",
  };

  // Utiliser imageGradient si présent, sinon bleu par défaut
  const heroGradient = gradients[game.imageGradient] || gradients.blue;

  // ADDED: Utiliser cover (ou image en fallback) avec le modèle standardisé
  const gameImage = toText(game.cover || game.image || "");
  const hasValidImage =
    gameImage &&
    gameImage !== "placeholder" &&
    gameImage.trim() &&
    (gameImage.startsWith("http://") || gameImage.startsWith("https://"));

  // ADDED: Style pour le hero-media (image en grand si disponible, sinon gradient)
  let heroMediaStyle = "";
  if (hasValidImage) {
    // ADDED: Overlay sombre pour améliorer la lisibilité du texte
    heroMediaStyle = `background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%), url('${escapeHtml(gameImage)}'); background-size: cover; background-position: center; background-repeat: no-repeat;`;
  } else {
    heroMediaStyle = `background: ${heroGradient};`;
  }

  // ADDED: Construire les infos clés uniquement si elles ont une valeur
  const infoItems = [];
  if (game.releaseDate && game.releaseDate.trim()) {
    infoItems.push(
      `<div class="info-item"><span class="info-label">Sortie</span><span class="info-value">${escapeHtml(game.releaseDate)}</span></div>`,
    );
  }
  if (game.studio && game.studio.trim()) {
    infoItems.push(
      `<div class="info-item"><span class="info-label">Studio</span><span class="info-value">${escapeHtml(game.studio)}</span></div>`,
    );
  }
  if (game.duration && game.duration.trim()) {
    infoItems.push(
      `<div class="info-item"><span class="info-label">Durée</span><span class="info-value">${escapeHtml(game.duration)}</span></div>`,
    );
  }
  if (game.difficulty && game.difficulty.trim()) {
    infoItems.push(
      `<div class="info-item"><span class="info-label">Difficulté</span><span class="info-value">${escapeHtml(game.difficulty)}</span></div>`,
    );
  }
  if (game.modes && Array.isArray(game.modes) && game.modes.length > 0) {
    infoItems.push(
      `<div class="info-item"><span class="info-label">Mode</span><span class="info-value">${escapeHtml(game.modes.join(" • "))}</span></div>`,
    );
  }

  // ADDED: Utiliser shortDesc (ou excerpt/subtitle en fallback) pour le tagline
  const tagline = toText(game.shortDesc || game.excerpt || game.subtitle || "");

  // ADDED: Utiliser content (ou description en fallback) pour l'aperçu
  const description = toText(game.content || game.description || "");

  gamePage.innerHTML = `
        <!-- Hero Section -->
        <div class="game-hero">
            <div class="game-hero-actions">
                <button class="btn-back" onclick="history.back()">← Retour</button>
            </div>
            <div class="hero-media" style="${heroMediaStyle}"></div>
            <div class="hero-content">
                <div class="hero-badges">
                    <span class="chip">${escapeHtml(consoleBadges)}</span>
                    <span class="chip">${escapeHtml(genreBadges)}</span>
                </div>
                <h1 class="hero-title">${escapeHtml(game.title || "")}</h1>
                ${tagline ? `<p class="hero-tagline">${escapeHtml(tagline)}</p>` : ""}
            </div>
        </div>
        
        <!-- Infos clés (affichées uniquement si au moins une info existe) -->
        ${infoItems.length > 0 ? `<div class="info-grid">${infoItems.join("")}</div>` : ""}
        
        <!-- ADDED: Articles liés au jeu -->
        ${renderLinkedArticles(game)}
    `;

  // Wrapper premium pour la grille d'articles liés
  const relatedGrid = gamePage.querySelector("#related-articles-grid");
  if (relatedGrid) {
    ensurePremiumPanel(relatedGrid, {
      title: "Articles sur ce jeu",
    });
  }
}

// ============================================
// ADDED: GESTION ÉQUIPE (Admin + Public)
// ============================================

/**
 * ADDED: Génère les initiales depuis un nom
 * @param {string} name - Nom complet
 * @returns {string} - Initiales (ex: "PC" pour "PINGON Clément")
 */
function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  } else if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return "?";
}

/**
 * ADDED: Normalise les champs avatar d'un membre (rétro-compatibilité)
 */
function normalizeAvatar(member) {
  if (!member || typeof member !== "object") return member;
  if (!member.avatarType) member.avatarType = "initials";
  if (!member.avatarCrop || typeof member.avatarCrop !== "object") {
    member.avatarCrop = { x: 0, y: 0, scale: 1 };
  } else {
    member.avatarCrop = {
      x: typeof member.avatarCrop.x === "number" ? member.avatarCrop.x : 0,
      y: typeof member.avatarCrop.y === "number" ? member.avatarCrop.y : 0,
      scale:
        typeof member.avatarCrop.scale === "number" &&
        member.avatarCrop.scale >= 1
          ? member.avatarCrop.scale
          : 1,
    };
  }
  return member;
}

/**
 * ADDED: Rend l'avatar d'un membre (image avec crop ou initiales)
 * @param {Object} member - Membre
 * @param {number} size - Taille en px (défaut 56)
 * @returns {string} - HTML de l'avatar
 */
function renderMemberAvatar(member, size) {
  if (!member) return "";

  member = normalizeAvatar(member);
  const safeSize = Number(size) || 56;

  // Si avatarType === "image" et avatarUrl présent => afficher image avec crop
  if (
    member.avatarType === "image" &&
    member.avatarUrl &&
    member.avatarUrl.trim()
  ) {
    const alt = member.name ? `Avatar de ${escapeHtml(member.name)}` : "Avatar";
    return `
            <div class="avatar avatar--image" data-avatar="1" style="width:${safeSize}px;height:${safeSize}px">
                <img class="avatar-img" src="${escapeHtml(member.avatarUrl)}" alt="${alt}">
            </div>
        `;
  }

  // Fallback initiales
  const initials =
    (member.initials || "").trim() ||
    (member.name
      ? member.name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "?");
  return `
        <div class="avatar avatar--initials" style="width:${safeSize}px;height:${safeSize}px">
            <span>${escapeHtml(initials)}</span>
        </div>
    `;
}

/**
 * ADDED: Applique le crop (transform) à l'image avatar
 * @param {HTMLElement} avatarRootEl - Élément racine de l'avatar (.avatar)
 * @param {Object} member - Membre avec avatarCrop
 */
function applyAvatarCrop(avatarRootEl, member) {
  if (!avatarRootEl) return;

  member = normalizeAvatar(member);
  const img = avatarRootEl.querySelector(".avatar-img");
  if (!img) return;

  const c = member.avatarCrop || { x: 0, y: 0, scale: 1 };
  const x = Number(c.x) || 0;
  const y = Number(c.y) || 0;
  const s = Number(c.scale) || 1;

  // Cumuler le centrage (-50%, -50%) + le crop (translate + scale)
  img.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${s})`;
}

/**
 * ADDED: Récupère l'URL de l'avatar d'un membre
 */
function getMemberAvatarUrl(member) {
  if (!member) return null;

  const normalized = normalizeTeamMember(member);
  if (!normalized) return null;

  if (normalized.avatarType === "media" && normalized.avatarMediaId) {
    const media = getMediaById(normalized.avatarMediaId);
    if (media && media.url) {
      return toText(media.url);
    }
  } else if (normalized.avatarType === "url" && normalized.avatarUrl) {
    const url = normalized.avatarUrl.trim();
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      return url;
    }
  }

  return null;
}

/**
 * ADDED: Compte les articles d'un membre
 */
function getMemberArticleCount(memberId) {
  if (!memberId) return 0;
  const articles = getArticlesData();
  return articles.filter((article) => {
    const articleAuthorId = toText(article.authorId || "");
    return articleAuthorId === memberId;
  }).length;
}

/**
 * ADDED: Rend la page équipe publique
 */
function renderTeamPage() {
  const teamGrid = document.getElementById("teamGrid");
  const teamHero = document.querySelector(".hero-card");

  if (!teamGrid) {
    console.warn("teamGrid non trouvé sur equipe.html");
    return;
  }

  try {
    // ADDED: Vérifier si on est en mode profil membre (?member=<id>)
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get("member");

    if (memberId) {
      // Mode profil membre
      renderMemberProfile(memberId, teamGrid, teamHero);
      return;
    }

    // Mode liste équipe standard
    const teamData = getTeamData();
    const allMembers =
      teamData && Array.isArray(teamData.members) ? teamData.members : [];
    // ADDED: Filtrer uniquement les membres actifs
    const members = allMembers.filter((m) => {
      const normalized = normalizeTeamMember(m);
      return normalized && normalized.isActive !== false;
    });

    // Mettre à jour le hero avec aboutTitle et aboutText
    if (teamHero && teamData) {
      const titleEl = teamHero.querySelector("h1");
      const subtitleEl = teamHero.querySelector("p");
      if (titleEl) titleEl.textContent = teamData.aboutTitle || "Équipe";
      const memberCount = members.length;
      const memberText =
        memberCount === 1 ? "1 membre" : `${memberCount} membres`;
      if (subtitleEl)
        subtitleEl.textContent = `${teamData.aboutText || "Les admins et rédacteurs du site"} • ${memberText}`;
    }

    if (members.length === 0) {
      teamGrid.innerHTML =
        '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--spacing-3xl);">Aucun membre pour le moment.</p>';
      return;
    }

    // Trier par order puis name
    const sortedMembers = [...members].sort((a, b) => {
      const orderA = (normalizeTeamMember(a) || {}).order || 999;
      const orderB = (normalizeTeamMember(b) || {}).order || 999;
      if (orderA !== orderB) return orderA - orderB;
      const nameA = (normalizeTeamMember(a) || {}).name || "";
      const nameB = (normalizeTeamMember(b) || {}).name || "";
      return nameA.localeCompare(nameB);
    });

    let html = "";
    sortedMembers.forEach((member) => {
      if (!member) return;
      let normalized;
      try {
        normalized = normalizeTeamMember(member);
      } catch (e) {
        console.warn("Erreur lors de la normalisation d'un membre:", e);
        return;
      }
      if (!normalized) return;

      // ADDED: Utiliser renderMemberAvatar() pour générer l'avatar (image avec crop ou initiales)
      const avatarHtml = renderMemberAvatar(normalized, 120);

      // Badge rôle
      const roleLabels = {
        directeur: "Directeur",
        createur: "Créateur",
        redacteur: "Rédacteur",
      };
      const roleLabel = roleLabels[normalized.role] || normalized.role;
      const roleBadge = `<span class="team-role-badge team-role-${normalized.role}" style="display: inline-block; padding: 4px 12px; margin-bottom: var(--spacing-xs); background: ${normalized.role === "directeur" ? "rgba(59, 130, 246, 0.2)" : normalized.role === "createur" ? "rgba(139, 92, 246, 0.2)" : "rgba(34, 197, 94, 0.2)"}; border: 1px solid ${normalized.role === "directeur" ? "rgba(59, 130, 246, 0.4)" : normalized.role === "createur" ? "rgba(139, 92, 246, 0.4)" : "rgba(34, 197, 94, 0.4)"}; border-radius: var(--radius-sm); color: ${normalized.role === "directeur" ? "var(--color-accent)" : normalized.role === "createur" ? "#8B5CF6" : "#22C55E"}; font-size: 0.75em; font-weight: var(--font-weight-semibold); text-transform: uppercase;">${escapeHtml(roleLabel)}</span>`;

      // Liens sociaux (uniquement si remplis)
      let socialsHtml = "";
      const socialLabels = {
        youtube: "YouTube",
        tiktok: "TikTok",
        twitch: "Twitch",
        site: "Site",
      };

      Object.keys(normalized.links || {}).forEach((key) => {
        const url = normalized.links[key];
        if (url && url.trim()) {
          socialsHtml += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="team-social-link" style="display: inline-block; padding: 6px 12px; margin: 4px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-md); color: var(--color-accent); text-decoration: none; font-size: 0.875em; transition: all var(--transition-base);">${escapeHtml(socialLabels[key] || key)}</a>`;
        }
      });

      // ADDED: Compteur d'articles par nom (matching robuste comme sur membre.html)
      // Utiliser getArticlesByAuthorName() pour matcher par nom normalisé (comme membre.html)
      const articlesByAuthor = getArticlesByAuthorName(normalized.name);
      const articleCount = articlesByAuthor.length;
      const articleCountText =
        articleCount === 0
          ? "Aucun article"
          : articleCount === 1
            ? "1 article"
            : `${articleCount} articles`;

      // ADDED: Rendre la carte cliquable
      html += `
            <div class="team-card" style="display: flex; gap: var(--spacing-lg); padding: var(--spacing-xl); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); margin-bottom: var(--spacing-xl); cursor: pointer; transition: all var(--transition-base);" onclick="window.location.href='membre.html?member=${escapeHtml(normalized.slug || normalized.id)}'" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(0, 0, 0, 0.15)'" onmouseout="this.style.transform=''; this.style.boxShadow='var(--shadow-sm)'">
                <div class="team-avatar" style="flex-shrink: 0; width: 120px; height: 120px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); border: 2px solid rgba(59, 130, 246, 0.3); overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);">
                    ${avatarHtml}
                </div>
                <div class="team-info" style="flex: 1;">
                    <h2 style="font-size: 1.5em; font-family: var(--font-heading); color: var(--color-text-primary); margin-bottom: var(--spacing-xs);">${escapeHtml(normalized.name)}</h2>
                    ${roleBadge}
                    <p style="font-size: 0.875em; color: var(--color-text-secondary); margin-top: var(--spacing-xs); margin-bottom: var(--spacing-xs);">${escapeHtml(articleCountText)}</p>
                    ${normalized.tagline ? `<p style="font-size: 1em; color: var(--color-accent); margin-top: var(--spacing-xs); margin-bottom: var(--spacing-sm);">${escapeHtml(normalized.tagline)}</p>` : ""}
                    ${normalized.bio ? `<p style="font-size: 0.9375em; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: var(--spacing-md);">${escapeHtml(normalized.bio)}</p>` : ""}
                    ${socialsHtml ? `<div class="team-socials" style="margin-top: var(--spacing-md);" onclick="event.stopPropagation()">${socialsHtml}</div>` : ""}
                    <div style="margin-top: var(--spacing-md);">
                        <a href="membre.html?member=${escapeHtml(normalized.slug || normalized.id)}" class="btn btn-secondary" style="display: inline-block;" onclick="event.stopPropagation()">Voir le profil</a>
                    </div>
                </div>
            </div>
        `;
    });

    teamGrid.innerHTML = html;

    // ADDED: Appliquer le crop aux avatars image après insertion dans le DOM
    sortedMembers.forEach((member, index) => {
      const normalized = normalizeTeamMember(member);
      if (!normalized) return;

      const cardEl = teamGrid.querySelectorAll(".team-card")[index];
      if (cardEl) {
        const avatarEl = cardEl.querySelector('[data-avatar="1"]');
        if (avatarEl) {
          applyAvatarCrop(avatarEl, normalized);
        }
      }
    });

    // Ajouter styles pour hover et responsive
    const style = document.createElement("style");
    style.textContent = `
            .team-social-link:hover {
                background: rgba(59, 130, 246, 0.25) !important;
                border-color: rgba(59, 130, 246, 0.5) !important;
            }
            @media (max-width: 719px) {
                .team-card {
                    flex-direction: column !important;
                    align-items: center !important;
                    text-align: center !important;
                }
                .team-avatar {
                    width: 96px !important;
                    height: 96px !important;
                }
            }
        `;
    document.head.appendChild(style);
  } catch (error) {
    console.error("Erreur lors du rendu de la page équipe:", error);
    if (teamGrid) {
      teamGrid.innerHTML =
        '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--spacing-3xl);">Erreur lors du chargement de l\'équipe.</p>';
    }
  }
}

/**
 * ADDED: Rend le profil d'un membre avec ses articles
 * @param {string} memberId - ID du membre
 * @param {HTMLElement} container - Container pour le rendu
 * @param {HTMLElement} hero - Hero card (optionnel)
 */
function renderMemberProfile(memberId, container, hero) {
  if (!container) return;

  try {
    const members = getTeamMembers();
    const member = members.find((m) => m.id === memberId);

    if (!member) {
      container.innerHTML = `
                <div style="text-align: center; padding: var(--spacing-3xl);">
                    <h1 style="font-size: 2em; margin-bottom: var(--spacing-md); color: var(--color-text-primary);">Membre introuvable</h1>
                    <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-xl);">Le membre demandé n'existe pas ou a été supprimé.</p>
                    <a href="equipe.html" class="btn btn-primary">Retour à l'équipe</a>
                </div>
            `;
      return;
    }

    // Mettre à jour le hero
    if (hero) {
      const titleEl = hero.querySelector("h1");
      const subtitleEl = hero.querySelector("p");
      if (titleEl) titleEl.textContent = member.name;
      if (subtitleEl) subtitleEl.textContent = member.roleLine || "";
    }

    // Récupérer les articles de ce membre
    const articles = getArticlesData();
    const memberArticles = articles.filter((article) => {
      const articleAuthorId = toText(article.authorId || "");
      return articleAuthorId === memberId;
    });

    // Trier par date desc
    const sortedArticles = [...memberArticles].sort((a, b) => {
      const dateA = a.publishedAt || a.updatedAt || a.createdAt || a.date || "";
      const dateB = b.publishedAt || b.updatedAt || b.createdAt || b.date || "";
      if (dateA && dateB) {
        return dateB.localeCompare(dateA);
      }
      const idA = a.id || "";
      const idB = b.id || "";
      return idB.localeCompare(idA);
    });

    // Rendre les articles
    let articlesHtml = "";
    if (sortedArticles.length === 0) {
      articlesHtml = `
                <div style="text-align: center; padding: var(--spacing-3xl); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
                    <p style="color: var(--color-text-secondary); font-size: 1.125em;">Aucun article pour le moment.</p>
                </div>
            `;
    } else {
      articlesHtml = `
                <div class="articles-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-lg);">
                    ${sortedArticles.map((article) => renderArticleCard(article)).join("")}
                </div>
            `;
    }

    container.innerHTML = `
            <button class="btn-back" onclick="history.back()" style="margin-bottom: var(--spacing-xl);">← Retour</button>
            
            <!-- Section Articles -->
            <section style="margin-top: var(--spacing-3xl);">
                <h2 style="font-size: 1.75em; font-family: var(--font-heading); color: var(--color-text-primary); margin-bottom: var(--spacing-xl);">Articles de ${escapeHtml(member.name)}</h2>
                ${articlesHtml}
            </section>
        `;
  } catch (error) {
    console.error("Erreur lors du rendu du profil membre:", error);
    if (container) {
      container.innerHTML =
        '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--spacing-3xl);">Erreur lors du chargement du profil.</p>';
    }
  }
}

/**
 * ADDED: Rend la liste des membres dans l'admin
 */
function renderAdminTeamList() {
  // ADDED: Guard pour protéger la home
  const isAdminPage =
    document.body &&
    document.body.dataset &&
    document.body.dataset.page === "admin";
  if (!isAdminPage) return;

  const list = document.getElementById("adminTeamList");
  if (!list) {
    console.warn("adminTeamList non trouvé");
    return;
  }

  const teamData = getTeamData();
  const members =
    teamData && Array.isArray(teamData.members) ? teamData.members : [];

  if (members.length === 0) {
    list.innerHTML =
      '<div class="empty-state">Aucun membre pour le moment.</div>';
    return;
  }

  // Trier par order puis name
  const sortedMembers = [...members].sort((a, b) => {
    const orderA = (normalizeTeamMember(a) || {}).order || 999;
    const orderB = (normalizeTeamMember(b) || {}).order || 999;
    if (orderA !== orderB) return orderA - orderB;
    const nameA = (normalizeTeamMember(a) || {}).name || "";
    const nameB = (normalizeTeamMember(b) || {}).name || "";
    return nameA.localeCompare(nameB);
  });

  let html = "";
  sortedMembers.forEach((member) => {
    const normalized = normalizeTeamMember(member);
    if (!normalized) return;

    // Mini avatar (media > url > initials)
    let avatarHtml = "";
    const avatarUrl = getMemberAvatarUrl(normalized);
    if (avatarUrl) {
      avatarHtml = `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(normalized.name)}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">`;
    } else {
      avatarHtml = `<div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(59, 130, 246, 0.2); display: flex; align-items: center; justify-content: center; font-weight: var(--font-weight-bold); color: var(--color-accent); font-size: 0.875em;">${escapeHtml(normalized.initials)}</div>`;
    }

    // Badge rôle
    const roleLabels = {
      directeur: "Directeur",
      createur: "Créateur",
      redacteur: "Rédacteur",
    };
    const roleLabel = roleLabels[normalized.role] || normalized.role;

    html += `
            <div class="team-item" style="display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-md); background: rgba(31, 42, 68, 0.3); border: 1px solid var(--color-border); border-radius: var(--radius-md); transition: all var(--transition-base);">
                <div style="flex-shrink: 0;">
                    ${avatarHtml}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: var(--font-weight-semibold); color: var(--color-text-primary); margin-bottom: var(--spacing-xs);">${escapeHtml(normalized.name)}</div>
                    <div style="font-size: 0.875em; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs);">${escapeHtml(normalized.tagline || "")}</div>
                    <span style="display: inline-block; padding: 2px 8px; background: ${normalized.role === "directeur" ? "rgba(59, 130, 246, 0.2)" : normalized.role === "createur" ? "rgba(139, 92, 246, 0.2)" : "rgba(34, 197, 94, 0.2)"}; border: 1px solid ${normalized.role === "directeur" ? "rgba(59, 130, 246, 0.4)" : normalized.role === "createur" ? "rgba(139, 92, 246, 0.4)" : "rgba(34, 197, 94, 0.4)"}; border-radius: var(--radius-sm); color: ${normalized.role === "directeur" ? "var(--color-accent)" : normalized.role === "createur" ? "#8B5CF6" : "#22C55E"}; font-size: 0.75em; font-weight: var(--font-weight-semibold); text-transform: uppercase;">${escapeHtml(roleLabel)}</span>
                </div>
                <div style="display: flex; gap: var(--spacing-sm);">
                    <button type="button" class="btn btn-secondary" data-edit-team="${escapeHtml(normalized.id)}" style="font-size: 0.875em;">Modifier</button>
                    <button type="button" class="btn btn-cancel" data-delete-team="${escapeHtml(normalized.id)}" style="font-size: 0.875em;">Supprimer</button>
                </div>
            </div>
        `;
  });

  list.innerHTML = html;

  // Event delegation pour les boutons Modifier et Supprimer
  list.querySelectorAll("[data-edit-team]").forEach((btn) => {
    btn.addEventListener("click", function () {
      const memberId = this.dataset.editTeam;
      if (memberId) {
        editTeamMember(memberId);
      }
    });
  });

  list.querySelectorAll("[data-delete-team]").forEach((btn) => {
    btn.addEventListener("click", function () {
      const memberId = this.dataset.deleteTeam;
      if (
        memberId &&
        confirm("Êtes-vous sûr de vouloir supprimer ce membre ?")
      ) {
        deleteTeamMember(memberId);
      }
    });
  });
}

/**
 * ADDED: Ouvre le modal pour éditer un membre
 */
function editTeamMember(memberId) {
  const teamData = getTeamData();
  const members =
    teamData && Array.isArray(teamData.members) ? teamData.members : [];
  const member = members.find((m) => {
    const normalized = normalizeTeamMember(m);
    return normalized && normalized.id === memberId;
  });

  if (!member) {
    console.error("Membre non trouvé:", memberId);
    return;
  }

  const normalized = normalizeTeamMember(member);
  if (!normalized) return;

  // Pré-remplir le formulaire
  const modal = document.getElementById("teamMemberModal");
  const form = document.getElementById("teamMemberForm");
  const idInput = document.getElementById("team-member-id");
  const nameInput = document.getElementById("team-member-name");
  const roleSelect = document.getElementById("team-member-role-select");
  const titleInput = document.getElementById("team-member-title");
  const taglineInput = document.getElementById("team-member-tagline");
  const bioInput = document.getElementById("team-member-bio");
  const slugInput = document.getElementById("team-member-slug");
  const orderInput = document.getElementById("team-member-order");
  const avatarTypeSelect = document.getElementById("team-member-avatar-type");
  const avatarUrlInput = document.getElementById("team-member-avatar-url");
  const avatarMediaIdInput = document.getElementById(
    "team-member-avatar-media-id",
  );
  const initialsInput = document.getElementById("team-member-initials");
  const isActiveInput = document.getElementById("team-member-is-active");
  const youtubeInput = document.getElementById("team-member-youtube");
  const tiktokInput = document.getElementById("team-member-tiktok");
  const twitchInput = document.getElementById("team-member-twitch");
  const siteInput = document.getElementById("team-member-site");
  const titleEl = document.getElementById("teamMemberModalTitle");
  const deleteBtn = document.getElementById("team-member-delete");

  if (
    !modal ||
    !form ||
    !idInput ||
    !nameInput ||
    !roleSelect ||
    !avatarTypeSelect
  ) {
    console.error("Éléments modal équipe manquants");
    return;
  }

  idInput.value = normalized.id;
  nameInput.value = normalized.name;
  roleSelect.value = normalized.role || "redacteur";
  if (titleInput) titleInput.value = normalized.tagline || ""; // Utiliser tagline comme title
  if (taglineInput) taglineInput.value = normalized.tagline || "";
  if (bioInput) bioInput.value = normalized.bio || "";
  if (slugInput) slugInput.value = normalized.slug || "";
  if (orderInput) orderInput.value = normalized.order || 1;
  avatarTypeSelect.value = normalized.avatarType || "initials";
  if (avatarUrlInput) avatarUrlInput.value = normalized.avatarUrl || "";
  if (avatarMediaIdInput)
    avatarMediaIdInput.value = normalized.avatarMediaId || "";
  if (initialsInput)
    initialsInput.value = normalized.initials || normalized.avatarText || "";
  if (isActiveInput) isActiveInput.checked = normalized.isActive !== false;
  if (youtubeInput) youtubeInput.value = normalized.links.youtube || "";
  if (tiktokInput) tiktokInput.value = normalized.links.tiktok || "";
  if (twitchInput) twitchInput.value = normalized.links.twitch || "";
  if (siteInput) siteInput.value = normalized.links.site || "";
  if (titleEl) titleEl.textContent = "Éditer membre";
  if (deleteBtn) deleteBtn.style.display = "inline-block";

  // ADDED: Remplir les champs avatar image si type = image
  const avatarImageUrlInput = document.getElementById(
    "team-member-avatar-image-url",
  );
  const avatarZoomInput = document.getElementById("avatarZoom");
  const avatarZoomValue = document.getElementById("avatarZoomValue");
  if (avatarImageUrlInput && normalized.avatarType === "image") {
    avatarImageUrlInput.value = normalized.avatarUrl || "";
  }

  // Afficher/masquer les champs selon avatarType
  toggleAvatarTypeFields(normalized.avatarType || "initials");

  // ADDED: Si type = image, charger l'image et appliquer le crop
  if (normalized.avatarType === "image" && normalized.avatarUrl) {
    const cropImg = document.getElementById("avatarCropImg");
    if (cropImg) {
      cropImg.src = normalized.avatarUrl;
      cropImg.style.display = "block";
    }
    // Appliquer le crop existant
    const crop = normalized.avatarCrop || { x: 0, y: 0, scale: 1 };
    if (avatarZoomInput) {
      avatarZoomInput.value = crop.scale || 1;
    }
    if (avatarZoomValue) {
      avatarZoomValue.textContent = (crop.scale || 1).toFixed(2);
    }
    // Attendre que le cropper soit initialisé
    setTimeout(() => {
      if (typeof window.updateAvatarCropPreview === "function") {
        window.updateAvatarCropPreview(
          crop.x || 0,
          crop.y || 0,
          crop.scale || 1,
        );
      }
    }, 100);
  }

  // Mettre à jour la preview avatar (legacy)
  if (normalized.avatarType === "media" && normalized.avatarMediaId) {
    const media = getMediaById(normalized.avatarMediaId);
    if (media && media.url) {
      updateTeamMemberPhotoPreview(toText(media.url));
    }
  } else if (normalized.avatarType === "url" && normalized.avatarUrl) {
    updateTeamMemberPhotoPreview(normalized.avatarUrl);
  } else {
    updateTeamMemberPhotoPreview("");
  }

  // Ouvrir le modal
  modal.classList.add("is-open");
}

/**
 * ADDED: Affiche/masque les champs selon le type d'avatar
 */
function toggleAvatarTypeFields(avatarType) {
  const urlGroup = document.getElementById("team-member-avatar-url-group");
  const mediaGroup = document.getElementById("team-member-avatar-media-group");
  const imageGroup = document.getElementById("team-member-avatar-image-group");
  const initialsGroup = document.getElementById(
    "team-member-avatar-initials-group",
  );

  if (urlGroup)
    urlGroup.style.display = avatarType === "url" ? "block" : "none";
  if (mediaGroup)
    mediaGroup.style.display = avatarType === "media" ? "block" : "none";
  if (imageGroup)
    imageGroup.style.display = avatarType === "image" ? "block" : "none";
  if (initialsGroup)
    initialsGroup.style.display = avatarType === "initials" ? "block" : "none";

  // ADDED: Si type = image, initialiser le cropper
  if (avatarType === "image") {
    initAvatarCropper();
  }
}

/**
 * ADDED: Initialise le cropper d'avatar (drag + zoom)
 */
function initAvatarCropper() {
  const cropCircle = document.getElementById("avatarCropCircle");
  const cropImg = document.getElementById("avatarCropImg");
  const avatarImageUrlInput = document.getElementById(
    "team-member-avatar-image-url",
  );
  const avatarZoomInput = document.getElementById("avatarZoom");
  const avatarZoomValue = document.getElementById("avatarZoomValue");
  const avatarResetBtn = document.getElementById("avatarResetCrop");
  const pickAvatarMediaBtn = document.getElementById(
    "team-member-pick-avatar-media",
  );

  if (!cropCircle || !cropImg) return;

  // Variables pour le drag
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let baseX = 0;
  let baseY = 0;
  let currentCrop = { x: 0, y: 0, scale: 1 };

  // Fonction pour mettre à jour la preview
  function updateAvatarCropPreview(x, y, scale) {
    if (!cropImg) return;
    currentCrop = { x, y, scale };
    cropImg.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
  }

  // Exposer updateAvatarCropPreview globalement pour les autres fonctions
  window.updateAvatarCropPreview = updateAvatarCropPreview;

  // Exposer getCurrentAvatarCrop pour la sauvegarde
  window.getCurrentAvatarCrop = function () {
    return currentCrop;
  };

  // Charger l'image depuis l'input URL
  if (avatarImageUrlInput) {
    avatarImageUrlInput.addEventListener("input", function () {
      const url = this.value.trim();
      if (
        url &&
        (url.startsWith("http://") ||
          url.startsWith("https://") ||
          url.startsWith("data:image/"))
      ) {
        cropImg.src = url;
        cropImg.style.display = "block";
        // Réinitialiser le crop quand on change l'image
        currentCrop = { x: 0, y: 0, scale: 1 };
        if (avatarZoomInput) avatarZoomInput.value = "1";
        if (avatarZoomValue) avatarZoomValue.textContent = "1.00";
        updateAvatarCropPreview(0, 0, 1);
      } else {
        cropImg.style.display = "none";
      }
    });
  }

  // Slider zoom
  if (avatarZoomInput) {
    avatarZoomInput.addEventListener("input", function () {
      const scale = parseFloat(this.value) || 1;
      if (avatarZoomValue) {
        avatarZoomValue.textContent = scale.toFixed(2);
      }
      updateAvatarCropPreview(currentCrop.x, currentCrop.y, scale);
    });
  }

  // Bouton réinitialiser
  if (avatarResetBtn) {
    avatarResetBtn.addEventListener("click", function () {
      currentCrop = { x: 0, y: 0, scale: 1 };
      if (avatarZoomInput) {
        avatarZoomInput.value = "1";
      }
      if (avatarZoomValue) {
        avatarZoomValue.textContent = "1.00";
      }
      updateAvatarCropPreview(0, 0, 1);
    });
  }

  // Drag & drop
  cropCircle.addEventListener("pointerdown", function (e) {
    if (!cropImg || cropImg.style.display === "none") return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    baseX = currentCrop.x;
    baseY = currentCrop.y;
    cropCircle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  document.addEventListener("pointermove", function (e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const newX = baseX + dx;
    const newY = baseY + dy;
    updateAvatarCropPreview(newX, newY, currentCrop.scale);
  });

  document.addEventListener("pointerup", function () {
    if (isDragging) {
      isDragging = false;
    }
  });

  // ADDED: Bouton "Choisir depuis Médias" pour avatar image
  if (pickAvatarMediaBtn) {
    pickAvatarMediaBtn.addEventListener("click", function () {
      // Mémoriser que c'est pour l'avatar image
      window.__mediaTargetAvatarImage = true;
      openMediaPicker("article-block");
    });
  }
}

/**
 * ADDED: Met à jour la preview de l'avatar
 */
function updateTeamMemberPhotoPreview(url) {
  const preview = document.getElementById("team-member-photo-preview");
  const img = document.getElementById("team-member-photo-img");
  if (!preview || !img) return;

  if (
    url &&
    url.trim() &&
    (url.startsWith("http://") || url.startsWith("https://"))
  ) {
    img.src = url;
    preview.style.display = "flex";
  } else {
    preview.style.display = "none";
  }
}

/**
 * ADDED: Ferme le modal équipe
 */
function closeTeamMemberModal() {
  const modal = document.getElementById("teamMemberModal");
  if (modal) {
    modal.classList.remove("is-open");
    const form = document.getElementById("teamMemberForm");
    if (form) form.reset();
  }
}

/**
 * ADDED: Gère la soumission du formulaire équipe
 */
function handleTeamMemberFormSubmit(e) {
  e.preventDefault();

  const idInput = document.getElementById("team-member-id");
  const nameInput = document.getElementById("team-member-name");
  const roleSelect = document.getElementById("team-member-role-select");
  const titleInput = document.getElementById("team-member-title");
  const taglineInput = document.getElementById("team-member-tagline");
  const bioInput = document.getElementById("team-member-bio");
  const slugInput = document.getElementById("team-member-slug");
  const orderInput = document.getElementById("team-member-order");
  const avatarTypeSelect = document.getElementById("team-member-avatar-type");
  const avatarUrlInput = document.getElementById("team-member-avatar-url");
  const avatarImageUrlInput = document.getElementById(
    "team-member-avatar-image-url",
  ); // ADDED: Fix crash - déclarer la variable
  const avatarMediaIdInput = document.getElementById(
    "team-member-avatar-media-id",
  );
  const initialsInput = document.getElementById("team-member-initials");
  const isActiveInput = document.getElementById("team-member-is-active");
  const youtubeInput = document.getElementById("team-member-youtube");
  const tiktokInput = document.getElementById("team-member-tiktok");
  const twitchInput = document.getElementById("team-member-twitch");
  const siteInput = document.getElementById("team-member-site");

  if (
    !idInput ||
    !nameInput ||
    !roleSelect ||
    !orderInput ||
    !avatarTypeSelect
  ) {
    console.error("[team] Champs requis manquants");
    return;
  }

  const memberId = idInput ? idInput.value.trim() : "";
  const name = toText(nameInput.value).trim();
  const role = roleSelect.value;
  const order = parseInt(orderInput.value, 10);
  const avatarType = avatarTypeSelect.value;

  // Validation
  if (!name) {
    alert("Le nom est obligatoire");
    return;
  }

  if (
    !role ||
    (role !== "directeur" && role !== "createur" && role !== "redacteur")
  ) {
    alert("Le rôle est invalide");
    return;
  }

  if (!order || order < 1) {
    alert("L'ordre doit être >= 1");
    return;
  }

  // Validation avatar
  let avatarUrl = "";
  let avatarMediaId = "";
  let initials = "";
  let avatarCrop = { x: 0, y: 0, scale: 1 };

  if (avatarType === "image") {
    // ADDED: Type "image" avec recadrage
    avatarUrl = avatarImageUrlInput
      ? toText(avatarImageUrlInput.value).trim()
      : "";
    if (
      !avatarUrl ||
      (!avatarUrl.startsWith("http://") &&
        !avatarUrl.startsWith("https://") &&
        !avatarUrl.startsWith("data:image/"))
    ) {
      alert(
        "L'URL de l'avatar image doit commencer par http://, https:// ou data:image/",
      );
      return;
    }
    // Récupérer le crop actuel depuis le cropper
    if (typeof window.getCurrentAvatarCrop === "function") {
      avatarCrop = window.getCurrentAvatarCrop();
    }
  } else if (avatarType === "url") {
    avatarUrl = avatarUrlInput ? toText(avatarUrlInput.value).trim() : "";
    if (
      !avatarUrl ||
      (!avatarUrl.startsWith("http://") && !avatarUrl.startsWith("https://"))
    ) {
      alert("L'URL de l'avatar doit commencer par http:// ou https://");
      return;
    }
  } else if (avatarType === "media") {
    avatarMediaId = avatarMediaIdInput
      ? toText(avatarMediaIdInput.value).trim()
      : "";
    if (!avatarMediaId) {
      alert("Veuillez choisir un média depuis la médiathèque");
      return;
    }
    const media = getMediaById(avatarMediaId);
    if (!media) {
      alert("Le média sélectionné n'existe pas");
      return;
    }
  } else {
    initials = initialsInput
      ? toText(initialsInput.value).trim().substring(0, 3).toUpperCase()
      : "";
    if (!initials) {
      initials = getInitials(name);
    }
  }

  // Valider les liens (si remplis, doivent commencer par http)
  const links = {
    youtube: youtubeInput ? toText(youtubeInput.value).trim() : "",
    tiktok: tiktokInput ? toText(tiktokInput.value).trim() : "",
    twitch: twitchInput ? toText(twitchInput.value).trim() : "",
    site: siteInput ? toText(siteInput.value).trim() : "",
  };

  for (const [key, url] of Object.entries(links)) {
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      alert(`Le lien ${key} doit commencer par http:// ou https://`);
      return;
    }
  }

  const teamData = getTeamData();
  const members =
    teamData && Array.isArray(teamData.members) ? teamData.members : [];

  // ADDED: Si pas d'ID, c'est une création
  const isCreating = !memberId || memberId.trim() === "";
  const finalMemberId = isCreating
    ? `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    : memberId;

  const memberIndex = members.findIndex((m) => {
    const normalized = normalizeTeamMember(m);
    return normalized && normalized.id === finalMemberId;
  });

  // ADDED: Gérer slug (générer si vide, assurer unicité)
  let memberSlug = slugInput ? toText(slugInput.value).trim() : "";
  if (!memberSlug) {
    memberSlug = slugify(name);
  }
  // Assurer l'unicité du slug
  memberSlug = ensureUniqueMemberSlug(members, memberSlug, finalMemberId);

  // ADDED: Gérer title/tagline (title prioritaire)
  const title = titleInput ? toText(titleInput.value).trim() : "";
  const tagline = taglineInput ? toText(taglineInput.value).trim() : "";
  const finalTagline = title || tagline;

  // ADDED: Gérer isActive
  const isActive = isActiveInput ? isActiveInput.checked : true;

  // ADDED: Gérer avatarText (initiales)
  const avatarText = initials || getInitials(name);

  const updatedMember = normalizeTeamMember({
    id: finalMemberId,
    slug: memberSlug,
    name: name,
    role: role,
    title: title,
    tagline: finalTagline,
    bio: bioInput ? toText(bioInput.value).trim() : "",
    order: order,
    avatarType: avatarType,
    avatarUrl: avatarUrl,
    avatarMediaId: avatarMediaId,
    avatarCrop: avatarCrop, // ADDED: Sauvegarder le crop
    initials: avatarText,
    avatarText: avatarText,
    isActive: isActive,
    links: links,
  });

  if (memberIndex >= 0) {
    // Mettre à jour
    members[memberIndex] = updatedMember;
    console.log("[team] updated member", finalMemberId, updatedMember.name);
  } else {
    // Création (nouveau membre)
    members.push(updatedMember);
    console.log("[team] created member", updatedMember.id, updatedMember.name);
  }

  const updatedTeamData = {
    aboutTitle: teamData.aboutTitle || "Équipe",
    aboutText: teamData.aboutText || "Les admins et rédacteurs du site",
    members: members,
  };

  saveTeamData(updatedTeamData);
  renderAdminTeamList();
  closeTeamMemberModal();
}

/**
 * ADDED: Supprime un membre de l'équipe
 * @param {string} memberId - ID du membre à supprimer
 */
function deleteTeamMember(memberId) {
  if (!memberId) {
    console.error("[team] deleteTeamMember: memberId manquant");
    return;
  }

  // Récupérer les données actuelles (source de vérité unique)
  const teamData = getTeamData();
  const members =
    teamData && Array.isArray(teamData.members) ? teamData.members : [];

  // Trouver le membre pour log
  const memberToDelete = members.find((m) => {
    const normalized = normalizeTeamMember(m);
    return normalized && normalized.id === memberId;
  });

  if (!memberToDelete) {
    console.warn("[team] deleteTeamMember: membre non trouvé", memberId);
    return;
  }

  // Filtrer le membre à supprimer
  const filtered = members.filter((m) => {
    const normalized = normalizeTeamMember(m);
    return normalized && normalized.id !== memberId;
  });

  // Sauvegarder dans localStorage (même clé que le reste)
  const updatedTeamData = {
    aboutTitle: teamData.aboutTitle || "Équipe",
    aboutText: teamData.aboutText || "Les admins et rédacteurs du site",
    members: filtered,
  };

  saveTeamData(updatedTeamData);

  const normalized = normalizeTeamMember(memberToDelete);
  console.log("[team] deleted member", memberId, normalized?.name || "unknown");

  // Re-render immédiat de la liste
  renderAdminTeamList();
}

/**
 * ADDED: Crée un nouveau membre (ouvre le modal en mode création)
 */
function createTeamMember() {
  const modal = document.getElementById("teamMemberModal");
  const form = document.getElementById("teamMemberForm");
  const idInput = document.getElementById("team-member-id");
  const titleEl = document.getElementById("teamMemberModalTitle");
  const deleteBtn = document.getElementById("team-member-delete");

  if (!modal || !form || !idInput || !titleEl) {
    console.error("[team] Éléments modal équipe manquants");
    return;
  }

  // Réinitialiser le formulaire
  form.reset();
  idInput.value = ""; // Pas d'ID = création
  if (titleEl) titleEl.textContent = "Ajouter un auteur";
  if (deleteBtn) deleteBtn.style.display = "none";

  // Valeurs par défaut
  const orderInput = document.getElementById("team-member-order");
  const avatarTypeSelect = document.getElementById("team-member-avatar-type");
  const isActiveInput = document.getElementById("team-member-is-active");
  if (orderInput) orderInput.value = "1";
  if (avatarTypeSelect) avatarTypeSelect.value = "initials";
  if (isActiveInput) isActiveInput.checked = true;

  // Afficher/masquer les champs selon avatarType
  toggleAvatarTypeFields("initials");

  // Réinitialiser la preview avatar
  updateTeamMemberPhotoPreview("");

  // Ouvrir le modal
  modal.classList.add("is-open");
  console.log("[team] opening modal for new member");
}

/**
 * ADDED: Rend la page membre publique (profil + articles)
 */
function renderMemberPage() {
  const memberPage = document.getElementById("member-page");
  if (!memberPage) {
    console.error("member-page non trouvé");
    return;
  }

  // Lire le paramètre member depuis l'URL
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get("member");

  if (!memberId) {
    memberPage.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-3xl);">
                <h1 style="font-size: 2em; margin-bottom: var(--spacing-md); color: var(--color-text-primary);">Membre introuvable</h1>
                <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-xl);">Le membre demandé n'existe pas ou a été supprimé.</p>
                <a href="equipe.html" class="btn btn-primary">Retour à l'équipe</a>
            </div>
        `;
    return;
  }

  // Récupérer les données équipe
  const teamData = getTeamData();
  const members =
    teamData && Array.isArray(teamData.members) ? teamData.members : [];
  const member = members.find((m) => {
    const normalized = normalizeTeamMember(m);
    return normalized && normalized.id === memberId;
  });

  if (!member) {
    memberPage.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-3xl);">
                <h1 style="font-size: 2em; margin-bottom: var(--spacing-md); color: var(--color-text-primary);">Membre introuvable</h1>
                <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-xl);">Le membre demandé n'existe pas ou a été supprimé.</p>
                <a href="equipe.html" class="btn btn-primary">Retour à l'équipe</a>
            </div>
        `;
    return;
  }

  const normalized = normalizeTeamMember(member);
  if (!normalized) {
    memberPage.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-3xl);">
                <h1 style="font-size: 2em; margin-bottom: var(--spacing-md); color: var(--color-text-primary);">Erreur</h1>
                <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-xl);">Impossible de charger les données du membre.</p>
                <a href="equipe.html" class="btn btn-primary">Retour à l'équipe</a>
            </div>
        `;
    return;
  }

  // Mettre à jour le titre de la page
  document.title = `${normalized.name} - LE MONT DE LERMITE`;

  // ADDED: Utiliser renderMemberAvatar() pour générer l'avatar (image avec crop ou initiales)
  const avatarHtml = renderMemberAvatar(normalized, 150);

  // Badge rôle
  const roleLabels = {
    directeur: "Directeur",
    createur: "Créateur",
    redacteur: "Rédacteur",
  };
  const roleLabel = roleLabels[normalized.role] || normalized.role;
  const roleBadge = `<span class="team-role-badge team-role-${normalized.role}" style="display: inline-block; padding: 4px 12px; margin-bottom: var(--spacing-xs); background: ${normalized.role === "directeur" ? "rgba(59, 130, 246, 0.2)" : normalized.role === "createur" ? "rgba(139, 92, 246, 0.2)" : "rgba(34, 197, 94, 0.2)"}; border: 1px solid ${normalized.role === "directeur" ? "rgba(59, 130, 246, 0.4)" : normalized.role === "createur" ? "rgba(139, 92, 246, 0.4)" : "rgba(34, 197, 94, 0.4)"}; border-radius: var(--radius-sm); color: ${normalized.role === "directeur" ? "var(--color-accent)" : normalized.role === "createur" ? "#8B5CF6" : "#22C55E"}; font-size: 0.75em; font-weight: var(--font-weight-semibold); text-transform: uppercase;">${escapeHtml(roleLabel)}</span>`;

  // Liens sociaux (uniquement si remplis)
  let socialsHtml = "";
  const socialLabels = {
    youtube: "YouTube",
    tiktok: "TikTok",
    twitch: "Twitch",
    site: "Site",
  };

  Object.keys(normalized.links || {}).forEach((key) => {
    const url = normalized.links[key];
    if (url && url.trim()) {
      socialsHtml += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="team-social-link" style="display: inline-block; padding: 6px 12px; margin: 4px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-md); color: var(--color-accent); text-decoration: none; font-size: 0.875em; transition: all var(--transition-base);">${escapeHtml(socialLabels[key] || key)}</a>`;
    }
  });

  // Récupérer le nom du membre pour le filtrage
  const memberName = normalized.name || "";

  // ADDED: Logs de debug temporaires
  console.log("[member] memberName=", memberName);
  console.log("[member] memberId=", memberId);

  // Récupérer les articles via la source de vérité unique (merge data.js + override)
  const articles = getArticlesData();
  console.log("[member] articles count=", articles.length);

  // Filtrer les articles de ce membre
  // Priorité 1: authorId correspond au memberId
  // Priorité 2: authorName ou author (texte) correspond exactement au nom du membre
  // Fallback: comparaison normalisée (lowercase + accents)
  let memberArticles = articles.filter((article) => {
    // Match par authorId si présent
    const articleAuthorId = toText(article.authorId || "");
    if (articleAuthorId && articleAuthorId === memberId) {
      return true;
    }

    // Match par authorName ou author (texte)
    const articleAuthor = toText(
      article.authorName || article.author || "",
    ).trim();
    if (articleAuthor && articleAuthor === memberName) {
      return true;
    }

    return false;
  });

  // Fallback: si aucun résultat exact, essayer comparaison normalisée
  if (memberArticles.length === 0) {
    const normalizeForCompare = (str) => {
      if (!str) return "";
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Supprimer accents
        .trim();
    };

    const normalizedMemberName = normalizeForCompare(memberName);
    memberArticles = articles.filter((article) => {
      const articleAuthor = toText(
        article.authorName || article.author || "",
      ).trim();
      if (!articleAuthor) return false;
      return normalizeForCompare(articleAuthor) === normalizedMemberName;
    });
  }

  console.log("[member] matched count=", memberArticles.length);

  // Compteur d'articles
  const articleCount = memberArticles.length;
  const articleCountText =
    articleCount === 0
      ? "Aucun article"
      : articleCount === 1
        ? "1 article"
        : `${articleCount} articles`;

  // Trier par date desc
  const sortedArticles = [...memberArticles].sort((a, b) => {
    const dateA = a.publishedAt || a.updatedAt || a.createdAt || a.date || "";
    const dateB = b.publishedAt || b.updatedAt || b.createdAt || b.date || "";
    if (dateA && dateB) {
      return dateB.localeCompare(dateA);
    }
    const idA = a.id || "";
    const idB = b.id || "";
    return idB.localeCompare(idA);
  });

  // Rendre les articles
  let articlesHtml = "";
  if (sortedArticles.length === 0) {
    articlesHtml = `
            <div style="text-align: center; padding: var(--spacing-3xl); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
                <p style="color: var(--color-text-secondary); font-size: 1.125em;">Aucun article pour le moment.</p>
            </div>
        `;
  } else {
    articlesHtml = `
            <div class="articles-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-lg);">
                ${sortedArticles.map((article) => renderArticleCard(article)).join("")}
            </div>
        `;
  }

  memberPage.innerHTML = `
        <button class="btn-back" onclick="history.back()" style="margin-bottom: var(--spacing-xl);">← Retour</button>
        
        <!-- Carte profil -->
        <div class="team-card" style="display: flex; gap: var(--spacing-lg); padding: var(--spacing-xl); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); margin-bottom: var(--spacing-3xl);">
            <div class="team-avatar" style="flex-shrink: 0; width: 150px; height: 150px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); border: 2px solid rgba(59, 130, 246, 0.3); overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);">
                ${avatarHtml}
            </div>
            <div class="team-info" style="flex: 1;">
                <h1 style="font-size: 2em; font-family: var(--font-heading); color: var(--color-text-primary); margin-bottom: var(--spacing-xs);">${escapeHtml(normalized.name)}</h1>
                ${roleBadge}
                <p style="font-size: 1em; color: var(--color-text-secondary); margin-top: var(--spacing-xs); margin-bottom: var(--spacing-sm);">${escapeHtml(articleCountText)}</p>
                ${normalized.tagline ? `<p style="font-size: 1.125em; color: var(--color-accent); margin-top: var(--spacing-xs); margin-bottom: var(--spacing-sm);">${escapeHtml(normalized.tagline)}</p>` : ""}
                ${normalized.bio ? `<p style="font-size: 1em; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: var(--spacing-md);">${escapeHtml(normalized.bio)}</p>` : ""}
                ${socialsHtml ? `<div class="team-socials" style="margin-top: var(--spacing-md);">${socialsHtml}</div>` : ""}
            </div>
        </div>
        
        <!-- Section Articles -->
        <section style="margin-top: var(--spacing-3xl);">
            <h2 style="font-size: 1.75em; font-family: var(--font-heading); color: var(--color-text-primary); margin-bottom: var(--spacing-xl);">Articles de ${escapeHtml(normalized.name)}</h2>
            ${articlesHtml}
        </section>
    `;

  // ADDED: Appliquer le crop à l'avatar après insertion dans le DOM
  const avatarEl = memberPage.querySelector('[data-avatar="1"]');
  if (avatarEl) {
    applyAvatarCrop(avatarEl, normalized);
  }
}

/**
 * ADDED: Rend la page auteur dédiée (isolée, ne modifie pas les autres pages)
 */
function renderAuteurPage() {
  const auteurPage = document.getElementById("auteur-page");
  if (!auteurPage) {
    console.warn("auteur-page non trouvé");
    return;
  }

  // Lire le paramètre id depuis l'URL
  const params = new URLSearchParams(window.location.search);
  const authorId = params.get("id");

  if (!authorId) {
    auteurPage.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-3xl);">
                <h1 style="font-size: 2em; margin-bottom: var(--spacing-md); color: var(--color-text-primary);">Auteur introuvable</h1>
                <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-xl);">Aucun identifiant d'auteur n'a été fourni.</p>
                <a href="index.html" class="btn btn-primary">Retour à l'accueil</a>
            </div>
        `;
    return;
  }

  // Récupérer l'auteur
  const author = getAuthorById(authorId);

  if (!author) {
    auteurPage.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-3xl);">
                <h1 style="font-size: 2em; margin-bottom: var(--spacing-md); color: var(--color-text-primary);">Auteur introuvable</h1>
                <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-xl);">L'auteur demandé n'existe pas.</p>
                <a href="index.html" class="btn btn-primary">Retour à l'accueil</a>
            </div>
        `;
    return;
  }

  // Mettre à jour le titre de la page
  document.title = `${author.name} - LE MONT DE LERMITE`;

  // Avatar (initiales basées sur le nom)
  const initials = author.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const avatarHtml = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2em; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${escapeHtml(initials)}</div>`;

  // Liens sociaux (uniquement si remplis)
  let socialsHtml = "";
  if (author.socials && typeof author.socials === "object") {
    const socialLabels = {
      youtube: "YouTube",
      tiktok: "TikTok",
      twitch: "Twitch",
      twitter: "Twitter",
      site: "Site web",
    };

    Object.keys(author.socials).forEach((key) => {
      const url = author.socials[key];
      if (url && url.trim()) {
        socialsHtml += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="team-social-link" style="display: inline-block; padding: 6px 12px; margin: 4px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-md); color: var(--color-accent); text-decoration: none; font-size: 0.875em; transition: all var(--transition-base);">${escapeHtml(socialLabels[key] || key)}</a>`;
      }
    });
  }

  // Récupérer les articles de cet auteur (filtrage isolé, ne modifie pas les autres fonctions)
  const articles = getArticlesData();
  const authorArticles = articles.filter((article) => {
    // Match si article.authorId == id
    const articleAuthorId = toText(article.authorId || "");
    if (articleAuthorId === authorId) return true;

    // Match si normalizeAuthorId(article.author) == id
    const authorText = toText(article.author || article.authorName || "");
    if (authorText) {
      const normalizedId = normalizeAuthorId(authorText);
      if (normalizedId === authorId) return true;
    }

    return false;
  });

  // Compteur d'articles
  const articleCount = authorArticles.length;
  const articleCountText =
    articleCount === 0
      ? "Aucun article"
      : articleCount === 1
        ? "1 article"
        : `${articleCount} articles`;

  // Trier par date desc
  const sortedArticles = [...authorArticles].sort((a, b) => {
    const dateA = a.publishedAt || a.updatedAt || a.createdAt || a.date || "";
    const dateB = b.publishedAt || b.updatedAt || b.createdAt || b.date || "";
    if (dateA && dateB) {
      return dateB.localeCompare(dateA);
    }
    const idA = a.id || "";
    const idB = b.id || "";
    return idB.localeCompare(idA);
  });

  // Rendre les articles
  let articlesHtml = "";
  if (sortedArticles.length === 0) {
    articlesHtml = `
            <div style="text-align: center; padding: var(--spacing-3xl); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
                <p style="color: var(--color-text-secondary); font-size: 1.125em;">Aucun article pour le moment.</p>
            </div>
        `;
  } else {
    articlesHtml = `
            <div class="articles-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-lg);">
                ${sortedArticles.map((article) => renderArticleCard(article)).join("")}
            </div>
        `;
  }

  auteurPage.innerHTML = `
        <button class="btn-back" onclick="history.back()" style="margin-bottom: var(--spacing-xl); padding: var(--spacing-sm) var(--spacing-md); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text-primary); cursor: pointer; text-decoration: none; display: inline-block;">← Retour</button>
        
        <!-- Carte auteur -->
        <div class="team-card" style="display: flex; gap: var(--spacing-lg); padding: var(--spacing-xl); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); margin-bottom: var(--spacing-3xl);">
            <div class="team-avatar" style="flex-shrink: 0; width: 150px; height: 150px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); border: 2px solid rgba(59, 130, 246, 0.3); overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);">
                ${avatarHtml}
            </div>
            <div class="team-info" style="flex: 1;">
                <h1 style="font-size: 2em; font-family: var(--font-heading); color: var(--color-text-primary); margin-bottom: var(--spacing-xs);">${escapeHtml(author.name)}</h1>
                ${author.role ? `<span style="display: inline-block; padding: 4px 12px; margin-bottom: var(--spacing-xs); background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: var(--radius-sm); color: var(--color-accent); font-size: 0.75em; font-weight: var(--font-weight-semibold); text-transform: uppercase;">${escapeHtml(author.role)}</span>` : ""}
                <p style="font-size: 1em; color: var(--color-text-secondary); margin-top: var(--spacing-xs); margin-bottom: var(--spacing-sm);">${escapeHtml(articleCountText)}</p>
                ${author.bio ? `<p style="font-size: 1em; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: var(--spacing-md);">${escapeHtml(author.bio)}</p>` : ""}
                ${socialsHtml ? `<div class="team-socials" style="margin-top: var(--spacing-md);">${socialsHtml}</div>` : ""}
            </div>
        </div>
        
        <!-- Section Articles -->
        <section style="margin-top: var(--spacing-3xl);">
            <h2 style="font-size: 1.75em; font-family: var(--font-heading); color: var(--color-text-primary); margin-bottom: var(--spacing-md);">Articles de ${escapeHtml(author.name)}</h2>
            <p style="font-size: 1em; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl);">${articleCount} article${articleCount > 1 ? "s" : ""}</p>
            ${articlesHtml}
        </section>
    `;
}

// ============================================
// ADDED: GESTION PROMOS (CRUD + UI)
// ============================================

/**
 * ADDED: Génère un ID unique pour une promo
 */
function generatePromoId(promos) {
  // Utiliser timestamp + random pour garantir l'unicité
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  let id = `promo-${timestamp}-${random}`;
  // Vérifier l'unicité (très peu probable mais on vérifie)
  let counter = 0;
  while (promos.some((p) => p.id === id) && counter < 100) {
    counter++;
    id = `promo-${timestamp}-${random}-${counter}`;
  }
  return id;
}

/**
 * ADDED: Initialise l'onglet Promo (appelée au chargement et quand l'onglet devient actif)
 */
function initAdminPromoPage() {
  console.log("[promo] initAdminPromoPage called"); // DEBUG

  // ADDED: Initialisation Promos
  const btnAddPromo = document.getElementById("btn-add-promo");
  const btnCancelPromo = document.getElementById("promo-cancel");
  const btnClosePromo = document.getElementById("promoModalCloseBtn");
  const overlayPromo = document.getElementById("promoModalOverlay");
  const promoForm = document.getElementById("promoForm");

  // ADDED: Initialisation Sponsors
  const btnAddSponsor = document.getElementById("btn-add-sponsor");
  const btnCancelSponsor = document.getElementById("sponsor-cancel");
  const btnCloseSponsor = document.getElementById("sponsorModalCloseBtn");
  const overlaySponsor = document.getElementById("sponsorModalOverlay");
  const sponsorForm = document.getElementById("sponsorForm");

  if (btnAddPromo) {
    btnAddPromo.addEventListener("click", () => openPromoModal("create"));
  }

  if (btnCancelPromo) {
    btnCancelPromo.addEventListener("click", closePromoModal);
  }

  if (btnClosePromo) {
    btnClosePromo.addEventListener("click", closePromoModal);
  }

  if (overlayPromo) {
    overlayPromo.addEventListener("click", closePromoModal);
  }

  if (promoForm) {
    promoForm.addEventListener("submit", handlePromoFormSubmit);
  }

  // ADDED: Event listeners Sponsors
  if (btnAddSponsor) {
    btnAddSponsor.addEventListener("click", () => openSponsorModal("create"));
  }

  if (btnCancelSponsor) {
    btnCancelSponsor.addEventListener("click", closeSponsorModal);
  }

  if (btnCloseSponsor) {
    btnCloseSponsor.addEventListener("click", closeSponsorModal);
  }

  if (overlaySponsor) {
    overlaySponsor.addEventListener("click", closeSponsorModal);
  }

  if (sponsorForm) {
    sponsorForm.addEventListener("submit", handleSponsorFormSubmit);
  }

  // ADDED: Mise à jour du preview de l'image sponsor en temps réel
  const sponsorImageInput = document.getElementById("sponsor-imageUrl");
  if (sponsorImageInput) {
    sponsorImageInput.addEventListener("input", () => {
      updateImagePreview(
        "sponsor-imageUrl",
        "sponsorImagePreviewImg",
        "sponsorImagePreviewPlaceholder",
      );
    });
  }

  // ADDED: Bouton "Choisir depuis Médias" pour sponsor
  const btnChooseMediaSponsor = document.getElementById(
    "btn-choose-media-sponsor",
  );
  if (btnChooseMediaSponsor) {
    btnChooseMediaSponsor.addEventListener("click", () => {
      if (window.openMediaPicker) {
        window.openMediaPicker("sponsor", (mediaUrl) => {
          document.getElementById("sponsor-imageUrl").value = mediaUrl;
          updateImagePreview(
            "sponsor-imageUrl",
            "sponsorImagePreviewImg",
            "sponsorImagePreviewPlaceholder",
          );
        });
      } else {
        console.error("[sponsor] window.openMediaPicker not available");
      }
    });
  }

  // ADDED: Gestion du bouton supprimer sponsor
  const btnDeleteSponsor = document.getElementById("sponsor-delete");
  if (btnDeleteSponsor) {
    btnDeleteSponsor.addEventListener("click", () => {
      const sponsorId = document.getElementById("sponsor-id").value;
      if (sponsorId) {
        deleteSponsor(sponsorId);
      }
    });
  }

  // ADDED: Mise à jour du preview de l'image promo en temps réel
  const promoImageInput = document.getElementById("promo-imageUrl");
  if (promoImageInput) {
    promoImageInput.addEventListener("input", function () {
      updatePromoImagePreview(this.value);
    });
  }

  // ADDED: Bouton "Choisir depuis Médias" pour promo
  const btnChooseMediaPromo = document.getElementById("btn-choose-media-promo");
  if (btnChooseMediaPromo) {
    console.log("[promo] btn-choose-media-promo found, attaching listener"); // DEBUG
    btnChooseMediaPromo.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("[promo] btn-choose-media-promo clicked"); // DEBUG
      // Mémoriser la cible pour le media picker (récupération dynamique au moment du click)
      const promoImageInput = document.getElementById("promo-imageUrl");
      if (!promoImageInput) {
        console.error("[promo] promo-imageUrl input not found");
        return;
      }
      // ADDED: Utiliser le nouveau format avec type et onSelect
      window.__mediaPickerTarget = {
        type: "promo",
        targetInput: promoImageInput,
        onSelect: function (url) {
          promoImageInput.value = url;
          updatePromoImagePreview(url);
        },
      };
      // ADDED: Utiliser la fonction globale openMediaPicker
      if (window.openMediaPicker) {
        window.openMediaPicker("promo");
      } else {
        console.error("[promo] window.openMediaPicker not available");
      }
    });
  } else {
    console.warn("[promo] btn-choose-media-promo not found");
  }

  // ADDED: Rendre la liste des promos
  renderAdminPromosList();

  // ADDED: Rendre la liste des sponsors
  renderAdminSponsorsList();
}

/**
 * ADDED: Rend la liste des promos dans l'admin
 */
function renderAdminPromosList() {
  const list = document.getElementById("adminPromosList");
  if (!list) return;

  const promos = getPromosData();

  if (promos.length === 0) {
    list.innerHTML =
      '<div class="empty-state" style="color: var(--color-text-secondary); text-align: center; padding: var(--spacing-xl);">Aucune promo pour le moment</div>';
    return;
  }

  list.innerHTML = promos
    .map((promo) => {
      const title = toText(promo.title) || "Sans titre";
      const imageUrl = toText(promo.imageUrl || promo.image) || "";
      const promoText = toText(promo.promo || promo.promoText) || "";
      const priceOld = toText(promo.oldPrice || promo.priceOld) || "";
      const priceNew =
        toText(promo.price || promo.newPrice || promo.priceNew) || "";

      // Pré-calculer les parties HTML complexes pour éviter les erreurs de template string
      const imageHtml = imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" style="width: 120px; height: 80px; object-fit: cover; border-radius: var(--radius-sm);">`
        : '<div style="width: 120px; height: 80px; background: rgba(31, 42, 68, 0.5); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); font-size: 0.875em;">Pas d\'image</div>';

      const promoBadgeHtml = promoText
        ? `<span style="display: inline-block; background: var(--color-accent); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.875em; margin-bottom: var(--spacing-xs);">${escapeHtml(promoText)}</span>`
        : "";

      let priceHtml = "";
      if (priceOld || priceNew) {
        const oldPriceHtml = priceOld
          ? `<span style="text-decoration: line-through; margin-right: var(--spacing-xs);">${escapeHtml(priceOld)}</span>`
          : "";
        const newPriceHtml = priceNew
          ? `<span style="color: var(--color-accent); font-weight: var(--font-weight-semibold);">${escapeHtml(priceNew)}</span>`
          : "";
        priceHtml = `<div style="margin-top: var(--spacing-xs); color: var(--color-text-secondary); font-size: 0.875em;">${oldPriceHtml}${newPriceHtml}</div>`;
      }

      return `
            <div class="admin-item" style="display: flex; gap: var(--spacing-md); padding: var(--spacing-md); background: rgba(31, 42, 68, 0.3); border-radius: var(--radius-md); margin-bottom: var(--spacing-md);">
                ${imageHtml}
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 var(--spacing-xs) 0; color: var(--color-text-primary);">${escapeHtml(title)}</h3>
                    ${promoBadgeHtml}
                    ${priceHtml}
                </div>
                <div style="display: flex; gap: var(--spacing-sm); align-items: center;">
                    <button type="button" class="btn btn-secondary" data-edit-promo="${promo.id}" style="font-size: 0.875em;">Modifier</button>
                    <button type="button" class="btn btn-cancel" data-delete-promo="${promo.id}" style="font-size: 0.875em;">Supprimer</button>
                </div>
            </div>
        `;
    })
    .join("");

  // Event listeners pour Modifier/Supprimer
  list.querySelectorAll("[data-edit-promo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const promoId = btn.dataset.editPromo;
      const promo = promos.find((p) => p.id === promoId);
      if (promo) {
        openPromoModal("edit", promo);
      }
    });
  });

  list.querySelectorAll("[data-delete-promo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const promoId = btn.dataset.deletePromo;
      if (confirm("Êtes-vous sûr de vouloir supprimer cette promo ?")) {
        const promos = getPromosData();
        const filtered = promos.filter((p) => p.id !== promoId);
        savePromosData(filtered);
        renderAdminPromosList();
      }
    });
  });
}

/**
 * ADDED: Fonction générique pour mettre à jour l'aperçu d'image
 */
function updateImagePreview(inputId, previewImgId, placeholderId) {
  const inputEl = document.getElementById(inputId);
  const previewImg = document.getElementById(previewImgId);
  const previewPlaceholder = placeholderId
    ? document.getElementById(placeholderId)
    : null;

  if (!inputEl || !previewImg) return;

  const url = toText(inputEl.value);

  if (!url) {
    previewImg.style.display = "none";
    if (previewPlaceholder) {
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Aperçu indisponible";
    }
    return;
  }

  // Valider l'URL avant de charger (éviter ERR_NAME_NOT_RESOLVED)
  try {
    const urlObj = new URL(url);
    // Si l'URL est valide mais le hostname est vide ou invalide, ne pas charger
    if (
      !urlObj.hostname ||
      urlObj.hostname === "gaming-cdn.co" ||
      (urlObj.hostname.includes("localhost") &&
        !urlObj.hostname.includes("127.0.0.1"))
    ) {
      previewImg.style.display = "none";
      if (previewPlaceholder) {
        previewPlaceholder.style.display = "block";
        previewPlaceholder.textContent = "Aperçu indisponible";
      }
      return;
    }
  } catch (e) {
    // URL invalide (pas une URL absolue), peut être une data URL ou base64
    if (!url.startsWith("data:") && !url.startsWith("blob:")) {
      previewImg.style.display = "none";
      if (previewPlaceholder) {
        previewPlaceholder.style.display = "block";
        previewPlaceholder.textContent = "Aperçu indisponible";
      }
      return;
    }
  }

  const img = new Image();
  img.onload = function () {
    previewImg.src = url;
    previewImg.style.display = "block";
    if (previewPlaceholder) {
      previewPlaceholder.style.display = "none";
    }
  };
  img.onerror = function () {
    previewImg.style.display = "none";
    if (previewPlaceholder) {
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Image introuvable";
    }
  };
  img.src = url;
}

/**
 * ADDED: Rend la liste des sponsors dans l'admin
 */
function renderAdminSponsorsList() {
  const list = document.getElementById("adminSponsorsList");
  if (!list) return;

  const sponsors =
    typeof getSponsorsData === "function"
      ? getSponsorsData()
      : window.SPONSORS || window.SPONSORS_DATA || { items: [] };
  const sponsorsData = sponsors;
  const activeSponsor = pickActiveSponsor(sponsorsData.items);

  if (sponsorsData.items.length === 0) {
    list.innerHTML =
      '<div class="empty-state" style="color: var(--color-text-secondary); text-align: center; padding: var(--spacing-xl);">Aucun sponsor pour le moment</div>';
    return;
  }

  list.innerHTML = sponsorsData.items
    .map((sponsor) => {
      // Vérifier si ce sponsor est actif selon ses propres propriétés
      const isActive = sponsor.active === true;
      const statusClass = isActive
        ? "sponsor-item__status--active"
        : "sponsor-item__status--inactive";
      const statusText = isActive ? "Actif" : "Inactif";

      const imageHtml = sponsor.imageUrl
        ? `<img src="${escapeHtml(sponsor.imageUrl)}" alt="${escapeHtml(sponsor.title)}" class="sponsor-item__image">`
        : '<div class="sponsor-item__image" style="background: var(--color-surface-alt); display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); font-size: 0.875em;">Pas d\'image</div>';

      return `
            <div class="sponsor-item">
                <div class="sponsor-item__content">
                    ${imageHtml}
                    <div class="sponsor-item__info">
                        <h4>${escapeHtml(sponsor.title)}</h4>
                        <p>${escapeHtml(sponsor.subtitle || "Aucun sous-titre")}</p>
                    </div>
                </div>
                <div class="sponsor-item__status ${statusClass}">${statusText}</div>
                <div class="sponsor-item__actions">
                    <button type="button" class="btn btn-secondary" onclick="editSponsor('${sponsor.id}')" style="font-size: 0.875em;">Modifier</button>
                    <button type="button" class="btn btn-cancel" onclick="deleteSponsor('${sponsor.id}')" style="font-size: 0.875em;">Supprimer</button>
                </div>
            </div>
        `;
    })
    .join("");
}

/**
 * ADDED: Ouvre le modal sponsor en mode création ou édition
 */
function openSponsorModal(mode, sponsor = null) {
  const modal = document.getElementById("sponsorModal");
  const title = document.getElementById("sponsorModalTitle");
  const form = document.getElementById("sponsorForm");
  const deleteBtn = document.getElementById("sponsor-delete");

  if (!modal || !title || !form) return;

  // Réinitialiser le formulaire
  form.reset();
  clearFormErrors(form);

  if (mode === "edit" && sponsor) {
    title.textContent = "Modifier le sponsor";
    deleteBtn.style.display = "inline-block";

    // Remplir le formulaire
    document.getElementById("sponsor-id").value = sponsor.id;
    document.getElementById("sponsor-title").value = sponsor.title || "";
    document.getElementById("sponsor-subtitle").value = sponsor.subtitle || "";
    document.getElementById("sponsor-ctaUrl").value = sponsor.ctaUrl || "";
    document.getElementById("sponsor-ctaText").value =
      sponsor.ctaText || "Découvrir";
    document.getElementById("sponsor-imageUrl").value = sponsor.imageUrl || "";
    document.getElementById("sponsor-openNewTab").checked =
      sponsor.openNewTab || false;
    document.getElementById("sponsor-active").checked = sponsor.active || false;
    document.getElementById("sponsor-startAt").value = sponsor.startAt
      ? sponsor.startAt.split("T")[0]
      : "";
    document.getElementById("sponsor-endAt").value = sponsor.endAt
      ? sponsor.endAt.split("T")[0]
      : "";

    // Aperçu de l'image
    updateImagePreview(
      "sponsor-imageUrl",
      "sponsorImagePreviewImg",
      "sponsorImagePreviewPlaceholder",
    );
  } else {
    title.textContent = "Ajouter un sponsor";
    deleteBtn.style.display = "none";
    document.getElementById("sponsor-id").value = "";
  }

  modal.classList.add("is-open");
}

/**
 * ADDED: Ferme le modal sponsor
 */
function closeSponsorModal() {
  const modal = document.getElementById("sponsorModal");
  if (modal) {
    modal.classList.remove("is-open");
  }
}

/**
 * ADDED: Édite un sponsor
 */
function editSponsor(sponsorId) {
  const sponsorsData =
    typeof getSponsorsData === "function"
      ? getSponsorsData()
      : window.SPONSORS || window.SPONSORS_DATA || { items: [] };
  const sponsor = sponsorsData.items.find((s) => s.id === sponsorId);
  if (sponsor) {
    openSponsorModal("edit", sponsor);
  }
}

/**
 * ADDED: Supprime un sponsor
 */
function deleteSponsor(sponsorId) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce sponsor ?")) return;

  const sponsorsData =
    typeof getSponsorsData === "function"
      ? getSponsorsData()
      : window.SPONSORS || window.SPONSORS_DATA || { items: [] };
  sponsorsData.items = sponsorsData.items.filter((s) => s.id !== sponsorId);
  saveSponsorsData(sponsorsData);
  renderAdminSponsorsList();
}

/**
 * ADDED: Sauvegarde un sponsor depuis le formulaire
 */
function saveSponsor(formData) {
  try {
    const sponsor = normalizeSponsorPayload(formData);
    const sponsorsData = getSponsorsData();

    // Si c'est une édition, remplacer l'existant
    const existingIndex = sponsorsData.items.findIndex(
      (s) => s.id === sponsor.id,
    );
    if (existingIndex >= 0) {
      sponsorsData.items[existingIndex] = sponsor;
    } else {
      // Nouvelle création
      sponsorsData.items.push(sponsor);
    }

    // NOTE: Plusieurs sponsors peuvent être actifs simultanément
    // La logique de désactivation unique a été supprimée pour permettre
    // l'affichage de plusieurs sponsors dans le carousel public

    saveSponsorsData(sponsorsData);
    renderAdminSponsorsList();
    closeSponsorModal();

    return true;
  } catch (error) {
    showFormError("sponsor-" + error.field, error.message);
    return false;
  }
}

/**
 * ADDED: Ouvre le modal promo en mode création ou édition
 */
function openPromoModal(mode, promo = null) {
  const modal = document.getElementById("promoModal");
  const title = document.getElementById("promoModalTitle");
  const form = document.getElementById("promoForm");
  const deleteBtn = document.getElementById("promo-delete");

  if (!modal || !title || !form) return;

  if (mode === "edit" && promo) {
    title.textContent = "Modifier la promo";
    deleteBtn.style.display = "block";

    // Pré-remplir le formulaire
    document.getElementById("promo-id").value = promo.id || "";
    document.getElementById("promo-title").value = toText(promo.title) || "";
    document.getElementById("promo-url").value = toText(promo.url) || "";
    document.getElementById("promo-imageUrl").value =
      toText(promo.imageUrl || promo.image) || "";
    document.getElementById("promo-promo").value =
      toText(promo.promo || promo.promoText) || "";
    document.getElementById("promo-oldPrice").value =
      toText(promo.oldPrice || promo.priceOld) || "";
    document.getElementById("promo-price").value =
      toText(promo.price || promo.newPrice || promo.priceNew) || "";
    document.getElementById("promo-buttonText").value =
      toText(promo.buttonText) || "Voir l'offre";
    document.getElementById("promo-newTab").checked = promo.newTab !== false;

    // Mettre à jour le preview de l'image
    updatePromoImagePreview(document.getElementById("promo-imageUrl").value);
  } else {
    title.textContent = "Ajouter une promo";
    deleteBtn.style.display = "none";
    form.reset();
    // ADDED: S'assurer que l'ID est bien vidé en mode création
    document.getElementById("promo-id").value = "";
    document.getElementById("promo-buttonText").value = "Voir l'offre";
    document.getElementById("promo-newTab").checked = true;
    updatePromoImagePreview("");
  }

  modal.classList.add("is-open");
}

/**
 * ADDED: Ferme le modal promo
 */
function closePromoModal() {
  const modal = document.getElementById("promoModal");
  if (modal) {
    modal.classList.remove("is-open");
  }
}

/**
 * ADDED: Ouvre le modal bug
 */
function openBugModal(mode = "create", bug = null) {
  const modal = document.getElementById("bugModal");
  const title = document.getElementById("bugModalTitle");
  const form = document.getElementById("bugForm");

  if (!modal || !title || !form) return;

  if (mode === "edit" && bug) {
    title.textContent = "Modifier le bug";
    // Pré-remplir le formulaire
    document.getElementById("bug-id").value = bug.id || "";
    document.getElementById("bug-title").value = bug.title || "";
    document.getElementById("bug-desc").value = bug.desc || "";
    document.getElementById("bug-severity").value = bug.severity || "medium";
    document.getElementById("bug-page").value = bug.page || "";
    document.getElementById("bug-reporter").value = bug.reporter || "";
  } else {
    title.textContent = "Répertorier un bug";
    form.reset();
    document.getElementById("bug-id").value = "";
    document.getElementById("bug-severity").value = "medium";
  }

  modal.classList.add("is-open");
}

/**
 * ADDED: Ferme le modal bug
 */
function closeBugModal() {
  const modal = document.getElementById("bugModal");
  if (modal) {
    modal.classList.remove("is-open");
  }
}

/**
 * ADDED: Met à jour le preview de l'image promo
 */
function updatePromoImagePreview(url) {
  const previewImg = document.getElementById("promoImagePreviewImg");
  const previewPlaceholder = document.getElementById(
    "promoImagePreviewPlaceholder",
  );

  if (!previewImg || !previewPlaceholder) return;

  const urlTrimmed = toText(url);

  if (!urlTrimmed) {
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "block";
    previewPlaceholder.textContent = "Aperçu indisponible";
    return;
  }

  // ADDED: Valider l'URL avant de charger (éviter ERR_NAME_NOT_RESOLVED)
  try {
    const urlObj = new URL(urlTrimmed);
    // Si l'URL est valide mais le hostname est vide ou invalide, ne pas charger
    if (
      !urlObj.hostname ||
      urlObj.hostname === "gaming-cdn.co" ||
      (urlObj.hostname.includes("localhost") &&
        !urlObj.hostname.includes("127.0.0.1"))
    ) {
      previewImg.style.display = "none";
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Aperçu indisponible";
      return;
    }
  } catch (e) {
    // URL invalide (pas une URL absolue), peut être une data URL ou base64
    if (!urlTrimmed.startsWith("data:") && !urlTrimmed.startsWith("blob:")) {
      previewImg.style.display = "none";
      previewPlaceholder.style.display = "block";
      previewPlaceholder.textContent = "Aperçu indisponible";
      return;
    }
  }

  const img = new Image();
  img.onload = function () {
    previewImg.src = urlTrimmed;
    previewImg.style.display = "block";
    previewPlaceholder.style.display = "none";
  };
  img.onerror = function () {
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "block";
    previewPlaceholder.textContent = "Image introuvable";
  };
  img.src = urlTrimmed;
}

/**
 * ADDED: Gère la soumission du formulaire promo
 */
function handlePromoFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const id = form.querySelector("#promo-id").value;
  const title = toText(form.querySelector("#promo-title").value);
  const url = toText(form.querySelector("#promo-url").value);
  const imageUrl = toText(form.querySelector("#promo-imageUrl").value);
  const promo = toText(form.querySelector("#promo-promo").value);
  const oldPrice = toText(form.querySelector("#promo-oldPrice").value);
  const price = toText(form.querySelector("#promo-price").value);
  const buttonText =
    toText(form.querySelector("#promo-buttonText").value) || "Voir l'offre";
  const newTab = form.querySelector("#promo-newTab").checked;

  // Validation
  if (!title || !url) {
    alert("Le titre et l'URL sont obligatoires");
    return;
  }

  const promos = getPromosData();

  // ADDED: Vérifier si on est en mode édition ou création
  const isEditMode = id && id.trim() !== "";

  const promoData = {
    type: "offer",
    id: isEditMode ? id : generatePromoId(promos),
    title,
    url,
    imageUrl,
    promo,
    oldPrice,
    price,
    buttonText,
    newTab,
    createdAt: isEditMode
      ? promos.find((p) => p.id === id)?.createdAt || new Date().toISOString()
      : new Date().toISOString(),
  };

  if (isEditMode) {
    // Édition : mettre à jour la promo existante
    const index = promos.findIndex((p) => p.id === id);
    if (index >= 0) {
      // Conserver la date de création originale
      promoData.createdAt = promos[index].createdAt || promoData.createdAt;
      promos[index] = promoData;
    } else {
      // ID fourni mais promo introuvable, créer une nouvelle
      promos.push(promoData);
    }
  } else {
    // Création : ajouter une nouvelle promo
    promos.push(promoData);
  }

  savePromosData(promos);
  renderAdminPromosList();
  closePromoModal();
}

/**
 * ADDED: Gestionnaire de soumission du formulaire sponsor
 */
function handleSponsorFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  try {
    const success = saveSponsor(formData);
    if (!success) {
      // Les erreurs sont déjà affichées par saveSponsor
      return;
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du sponsor:", error);
    alert("Erreur lors de la sauvegarde: " + error.message);
  }
}

/**
 * ADDED: Rend les promos sur la page principale (max 5)
 */
function renderHomePromos() {
  const grid = document.getElementById("homePromosGrid");
  if (!grid) return;

  try {
    const promos = getPromosData();

    if (promos.length === 0) {
      grid.innerHTML =
        '<div style="color: var(--color-text-secondary); text-align: center; padding: var(--spacing-md);">Aucune promo pour le moment</div>';
      return;
    }

    // ADDED: Trier par createdAt (plus récentes en premier) si disponible, sinon garder l'ordre d'ajout
    const sortedPromos = [...promos].sort((a, b) => {
      const aDate = a.createdAt || a.ts || "";
      const bDate = b.createdAt || b.ts || "";
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      // Comparer les dates (ISO string ou timestamp)
      if (typeof aDate === "string" && typeof bDate === "string") {
        return bDate.localeCompare(aDate);
      }
      return bDate - aDate;
    });

    // Limiter à 5 promos (les 5 plus récentes)
    const limitedPromos = sortedPromos.slice(0, 5);

    grid.innerHTML = limitedPromos
      .map((promo) => renderOfferCard(promo))
      .join("");

    // ADDED: Styles pour la grille des promos (affichage vertical, max 5)
    if (!document.getElementById("promos-grid-style")) {
      const style = document.createElement("style");
      style.id = "promos-grid-style";
      style.textContent = `
                .promos-grid {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-md);
                }
                /* Afficher les 5 premières promos dans l'ordre d'ajout (les plus récentes en premier si createdAt existe) */
            `;
      document.head.appendChild(style);
    }

    // Appliquer fallbacks aux images après rendu
    setTimeout(() => applyImageFallbacks(grid), 100);
  } catch (e) {
    console.error("Erreur lors du rendu des promos:", e);
    grid.innerHTML =
      '<div style="color: var(--color-text-secondary); text-align: center; padding: var(--spacing-md);">Erreur de chargement</div>';
  }
}

/**
 * ADDED: Widget promos générique pour toutes les pages publiques
 */
function mountPromosWidget() {
  const grid = document.getElementById("promosSlot");
  if (!grid) return; // Si pas de slot promo sur cette page, on skip

  try {
    const promos = getPromosData();

    if (promos.length === 0) {
      grid.innerHTML =
        '<div style="color: var(--color-text-secondary); text-align: center; padding: var(--spacing-md);">Aucune promo pour le moment</div>';
      return;
    }

    // Trier par createdAt (plus récentes en premier) si disponible, sinon garder l'ordre d'ajout
    const sortedPromos = [...promos].sort((a, b) => {
      const aDate = a.createdAt || a.ts || "";
      const bDate = b.createdAt || b.ts || "";
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      // Comparer les dates (ISO string ou timestamp)
      if (typeof aDate === "string" && typeof bDate === "string") {
        return bDate.localeCompare(aDate);
      }
      return bDate - aDate;
    });

    // Afficher TOUTES les promos actives (scroll interne)
    grid.innerHTML = sortedPromos
      .map((promo) => renderOfferCard(promo))
      .join("");
  } catch (e) {
    console.error("Erreur lors du montage du widget promos:", e);
    grid.innerHTML =
      '<div style="color: var(--color-text-secondary); text-align: center; padding: var(--spacing-md);">Erreur de chargement</div>';
  }
}

/**
 * Génère les styles CSS pour les sponsors (avec fonds sombres immédiats pour éviter flash)
 */
function getSponsorStylesCSS() {
  return `
        /* ============================================
           STYLES PREMIUM POUR LES SPONSORS - AVEC FONDS SOMBRES IMMÉDIATS
           ============================================ */

        /* Bloc conteneur sponsor - FOND SOMBRE IMMÉDIAT */
        .sidebar-card {
            background: var(--color-surface) !important;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
            transition: all var(--transition-fast);
            margin-bottom: var(--spacing-lg);
        }

        .sidebar-card:hover {
            border-color: var(--color-accent);
            box-shadow: var(--shadow-md);
            transform: translateY(-2px);
        }

        /* Carte sponsor principale - FOND SOMBRE IMMÉDIAT */
        .sponsor-card {
            position: relative;
            display: block;
            text-decoration: none;
            color: inherit;
            background: var(--color-surface) !important;
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
            transition: all var(--transition-fast);
        }

        .sponsor-card:hover {
            box-shadow: var(--shadow-md);
            border-color: var(--color-accent);
            transform: translateY(-2px);
        }

        /* Média (image) avec ratio 16/9 - FOND SOMBRE POUR ÉVITER FLASH */
        .sponsor-media {
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 56.25%; /* Ratio 16/9 */
            background: var(--color-surface) !important; /* Fond sombre immédiat */
            overflow: hidden;
            isolation: isolate; /* Isolation pour éviter les conflits */
        }

        .sponsor-media img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            background: transparent !important; /* Pas de fond blanc */
            display: block; /* Évite les espaces blancs sous l'image */
            transition: transform var(--transition-fast);
        }

        .sponsor-card:hover .sponsor-media img {
            transform: scale(1.02);
        }

        /* Corps de la carte */
        .sponsor-body {
            padding: var(--spacing-lg);
        }

        /* Titre avec ellipsis */
        .sponsor-title {
            margin: 0 0 var(--spacing-sm) 0;
            font-size: 1.125em;
            font-weight: var(--font-weight-semibold);
            color: var(--color-text-primary);
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* Sous-titre avec line-clamp */
        .sponsor-subtitle {
            margin: 0 0 var(--spacing-md) 0;
            font-size: 0.875em;
            color: var(--color-text-secondary);
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* Bouton CTA cohérent */
        .sponsor-cta {
            display: inline-block;
            padding: var(--spacing-sm) var(--spacing-md);
            background: var(--color-accent);
            color: white;
            border-radius: var(--radius-sm);
            font-size: 0.875em;
            font-weight: var(--font-weight-medium);
            text-decoration: none;
            cursor: pointer;
            transition: background var(--transition-fast);
            border: none;
        }

        .sponsor-cta:hover {
            background: var(--color-accent-hover);
        }

        /* Badge "Sponsorisé" premium */
        .sponsor-badge {
            position: absolute;
            top: var(--spacing-md);
            right: var(--spacing-md);
            background: rgba(59, 130, 246, 0.95);
            backdrop-filter: blur(8px);
            color: white;
            padding: 4px var(--spacing-sm);
            border-radius: var(--radius-full);
            font-size: 0.75em;
            font-weight: var(--font-weight-medium);
            text-transform: uppercase;
            letter-spacing: 0.025em;
            z-index: 2;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Placeholder premium - FOND SOMBRE IMMÉDIAT */
        .sponsor-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-2xl) var(--spacing-lg);
            text-align: center;
            background: var(--color-surface) !important; /* Fond sombre immédiat */
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            color: var(--color-text-secondary);
            min-height: 120px;
        }

        .sponsor-placeholder-icon {
            width: 48px;
            height: 48px;
            margin-bottom: var(--spacing-md);
            opacity: 0.6;
            background: var(--color-accent-bg);
            border-radius: var(--radius-full);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .sponsor-placeholder-icon::before {
            content: "🎯";
            font-size: 24px;
        }

        .sponsor-placeholder h4 {
            margin: 0 0 var(--spacing-xs) 0;
            font-size: 1em;
            font-weight: var(--font-weight-medium);
            color: var(--color-text-primary);
        }

                .sponsor-placeholder p {
                    margin: 0;
                    font-size: 0.875em;
                    opacity: 0.8;
                }

                /* ============================================
                   FIX SURBRILLANCE SPONSOR - SOLUTION DÉFINITIVE
                   ============================================ */

                /* BLOQUER COMPLETEMENT LES EFFETS VISUELS AU CLIC SOURIS */
                .sponsor-card,
                .sponsor-card *,
                .sponsor-card a,
                .sponsor-card button,
                .sponsor-card a *,
                .sponsor-card button * {
                  -webkit-tap-highlight-color: transparent !important;
                  -webkit-user-select: none !important;
                  -moz-user-select: none !important;
                  user-select: none !important;
                }

                /* PATRON ACCESSIBLE: FOCUS SOURIS = RIEN, FOCUS CLAVIER = VISIBLE */
                /* Neutraliser seulement le focus souris (pas clavier) */
                .sponsor-card a:focus:not(:focus-visible),
                .sponsor-card button:focus:not(:focus-visible) {
                  outline: none !important;
                  box-shadow: none !important;
                  -webkit-box-shadow: none !important;
                  -moz-box-shadow: none !important;
                }

                /* LES ÉLÉMENTS DU SPONSOR SONT NON-FOCUSABLES PAR DÉFAUT */
                .sponsor-card a,
                .sponsor-card button,
                .sponsor-card input,
                .sponsor-card [tabindex] {
                  pointer-events: auto !important;
                  /* Garder tabindex="-1" par défaut pour éviter le focus automatique */
                }

                /* FOCUS ACCESSIBLE: SOURIS = RIEN, CLAVIER = VISIBLE */
                /* Neutraliser seulement le focus souris */
                .sponsor-card a:focus:not(:focus-visible),
                .sponsor-card button:focus:not(:focus-visible) {
                  outline: none !important;
                  box-shadow: none !important;
                  -webkit-box-shadow: none !important;
                  -moz-box-shadow: none !important;
                }

                /* Focus clavier visible et accessible */
                .sponsor-card a:focus-visible,
                .sponsor-card button:focus-visible {
                  outline: 2px solid var(--color-accent) !important;
                  outline-offset: 4px !important;
                  box-shadow: 0 0 0 1px var(--color-accent) !important;
                }
            `;
}

/**
 * Rend un sponsor dans un conteneur unique (simplifié selon specs)
 */
function renderSponsorsCarousel(containerId = "sponsorSlot") {
  const container = document.getElementById(containerId);
  if (!container) {
    // SUPPRIMÉ: sponsors retirés des pages publiques - container n'existe plus
    return;
  }

  // INJECTER LES STYLES AVANT TOUT POUR ÉVITER LE FLASH BLANC
  if (!document.getElementById("sponsor-styles")) {
    const style = document.createElement("style");
    style.id = "sponsor-styles";
    style.textContent = getSponsorStylesCSS();
    document.head.appendChild(style);
  }

  try {
    const sponsorsData =
      typeof getSponsorsData === "function"
        ? getSponsorsData()
        : window.SPONSORS || window.SPONSORS_DATA || { items: [] };

    // Récupérer TOUS les sponsors actifs
    let activeSponsors = [];
    if (sponsorsData.items && sponsorsData.items.length > 0) {
      activeSponsors = sponsorsData.items.filter(
        (sponsor) => sponsor.active === true,
      );
    }

    if (activeSponsors.length === 0) {
      // Aucun sponsor actif - placeholder premium
      container.innerHTML = `
                <div class="sponsor-placeholder" style="background: var(--color-surface);">
                    <div class="sponsor-placeholder-icon"></div>
                    <h4>Espace Sponsor</h4>
                    <p>Découvrez bientôt nos partenaires</p>
                </div>
            `;
      return;
    }

    // Générer le carousel HTML
    const carouselId = `sponsor-carousel-${Date.now()}`;

    let sponsorCards = "";
    let dots = "";

    activeSponsors.forEach((sponsor, index) => {
      const targetAttr = sponsor.openNewTab
        ? 'target="_blank" rel="noopener"'
        : "";
      const isFirst = index === 0;

      const cardHtml = `
                <a href="${escapeHtml(sponsor.ctaUrl || "#")}" ${targetAttr} class="sponsor-card" role="listitem" aria-label="${escapeHtml(sponsor.title)} - ${escapeHtml(sponsor.subtitle || "")}">
                    ${
                      sponsor.imageUrl
                        ? `
                        <div class="sponsor-media">
                            <img src="${escapeHtml(sponsor.imageUrl)}" alt="${escapeHtml(sponsor.title)}" loading="lazy">
                        </div>
                    `
                        : ""
                    }
                    <div class="sponsor-body">
                        <h4 class="sponsor-title">${escapeHtml(sponsor.title || "Sponsor")}</h4>
                        ${sponsor.subtitle ? `<p class="sponsor-subtitle">${escapeHtml(sponsor.subtitle)}</p>` : ""}
                        <button class="sponsor-cta">${escapeHtml(sponsor.ctaText || "Découvrir")}</button>
                    </div>
                    <span class="sponsor-badge">Sponsorisé</span>
                </a>
            `;
      sponsorCards += cardHtml;

      // Générer les dots
      dots += `<button class="sponsor-dot" aria-label="Aller au sponsor ${index + 1}" ${isFirst ? 'aria-selected="true"' : ""} data-slide="${index}"></button>`;
    });

    const carouselHtml = `
            <div class="sponsor-carousel" id="${carouselId}" role="region" aria-label="Carousel des sponsors">
                <div class="sponsor-track" role="list">
                    ${sponsorCards}
                </div>
                <div class="sponsor-controls">
                    <button class="sponsor-nav sponsor-prev" aria-label="Sponsor précédent" disabled>‹</button>
                    <div class="sponsor-dots" role="tablist">
                        ${dots}
                    </div>
                    <button class="sponsor-nav sponsor-next" aria-label="Sponsor suivant" ${activeSponsors.length <= 1 ? "disabled" : ""}>›</button>
                </div>
            </div>
        `;

    container.innerHTML = carouselHtml;

    // Initialiser les interactions du carousel
    initSponsorsCarousel(carouselId, activeSponsors.length);
  } catch (e) {
    console.error("Erreur lors du rendu du carousel sponsor:", e);
    container.innerHTML =
      '<div style="text-align: center; color: var(--color-text-secondary); padding: var(--spacing-md); font-size: 0.875em;">Espace publicitaire</div>';
  }
}

// Fonction d'initialisation des interactions du carousel
function initSponsorsCarousel(carouselId, totalSlides) {
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;

  const track = carousel.querySelector(".sponsor-track");
  const prevBtn = carousel.querySelector(".sponsor-prev");
  const nextBtn = carousel.querySelector(".sponsor-next");
  const dots = carousel.querySelectorAll(".sponsor-dot");

  let currentSlide = 0;

  function updateCarousel(instant = false) {
    // Mettre à jour les dots
    dots.forEach((dot, index) => {
      dot.setAttribute(
        "aria-selected",
        index === currentSlide ? "true" : "false",
      );
    });

    // Mettre à jour les boutons de navigation
    prevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide === totalSlides - 1;

    // Scroll vers le slide actuel
    const cardWidth = track.children[0].offsetWidth;
    track.scrollTo({
      left: currentSlide * cardWidth,
      behavior: instant ? "auto" : "smooth",
    });
  }

  // Gestionnaire des boutons prev/next
  prevBtn.addEventListener("click", () => {
    if (currentSlide > 0) {
      currentSlide--;
      updateCarousel();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentSlide < totalSlides - 1) {
      currentSlide++;
      updateCarousel();
    }
  });

  // Gestionnaire des dots
  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      currentSlide = index;
      updateCarousel();
    });
  });

  // Gestionnaire du scroll pour synchroniser avec les dots
  let scrollTimeout;
  track.addEventListener("scroll", () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const cardWidth = track.children[0].offsetWidth;
      const scrollLeft = track.scrollLeft;
      const newSlide = Math.round(scrollLeft / cardWidth);

      if (
        newSlide !== currentSlide &&
        newSlide >= 0 &&
        newSlide < totalSlides
      ) {
        currentSlide = newSlide;
        updateCarousel(true); // instant pour éviter les conflits
      }
    }, 100);
  });

  // Initialisation
  updateCarousel(true);
}

// Alias pour compatibilité avec l'ancien nom
function renderSponsorWidget(containerId = "sponsorSlot") {
  renderSponsorsCarousel(containerId);
}

// ============================================
// PARTNERSHIP BLOCK - RENDER PUBLIC PREMIUM
// ============================================
function renderPartnershipBlock() {
  const root = document.getElementById("partnershipBlock");
  if (!root) {
    // Slot absent sur certaines pages (ex: equipe.html) => normal, pas d'erreur
    return;
  }

  try {
    const sponsorsData =
      typeof getSponsorsData === "function"
        ? getSponsorsData()
        : window.SPONSORS || window.SPONSORS_DATA || { items: [] };
    let activeItems = [];

    if (sponsorsData.items && sponsorsData.items.length > 0) {
      const now = new Date();

      // Filtrer les sponsors actifs et dans la période valide
      activeItems = sponsorsData.items.filter((sponsor) => {
        if (sponsor.active !== true) return false;

        // Vérifier les dates si présentes
        if (sponsor.startAt) {
          const startDate = new Date(sponsor.startAt);
          if (now < startDate) return false;
        }

        if (sponsor.endAt) {
          const endDate = new Date(sponsor.endAt);
          if (now > endDate) return false;
        }

        return true;
      });
    }

    // Si aucun item actif, masquer le bloc
    if (activeItems.length === 0) {
      root.style.display = "none";
      return;
    }

    // Générer les cartes (pas de dots)
    let cardsHtml = "";

    activeItems.forEach((item, index) => {
      const targetAttr = item.openNewTab
        ? 'target="_blank" rel="noopener"'
        : "";
      const imageUrl = item.imageUrl || "";
      const backgroundStyle = imageUrl
        ? `style="background-image: url('${escapeHtml(imageUrl)}')"`
        : `style="background: linear-gradient(135deg, rgba(70,120,255,.2), rgba(120,70,255,.2))"`;

      const cardHtml = `
                <a class="ps-card" role="listitem"
                   href="${escapeHtml(item.ctaUrl || "#")}" ${targetAttr}
                   aria-label="Ouvrir: ${escapeHtml(item.title)}">
                    <div class="ps-media" ${backgroundStyle}></div>
                    <div class="ps-body">
                        <div class="ps-meta">
                            <span class="ps-brand">${escapeHtml(item.title || "Partenaire")}</span>
                            <span class="ps-badge">Sponsorisé</span>
                        </div>
                        <p class="ps-text">${escapeHtml(item.subtitle || "Découvrez cette offre exclusive")}</p>
                        <span class="ps-cta">${escapeHtml(item.ctaText || "Découvrir")}</span>
                    </div>
                </a>
            `;
      cardsHtml += cardHtml;
    });

    // Le centrage sera appliqué dynamiquement après le rendu

    // Générer le HTML complet - SANS FLÈCHES (swipe natif uniquement)
    const blockHtml = `
            <div class="ps-wrap">
                <div class="ps-shell">
                    <div class="ps-head">
                        <div class="ps-titlewrap">
                            <span class="ps-pill">PARTENARIAT</span>
                            <h2 class="ps-title">Offres partenaires</h2>
                        </div>
                    </div>

                    <div class="ps-carousel" role="region" aria-label="Carousel offres partenaires">
                        <div class="ps-track" role="list">
                            ${cardsHtml}
                        </div>
                        <div class="ps-dots" aria-hidden="true"></div>
                    </div>
                </div>
            </div>
        `;

    // Injecter le HTML complet en une passe
    root.style.display = "";
    root.innerHTML = blockHtml;

    // Appliquer le centrage dynamique après le rendu
    updatePartnershipCentering();

    // Initialiser les interactions
    initPartnershipCarousel(activeItems.length);
  } catch (e) {
    console.error("Erreur lors du rendu du bloc partenariat:", e);
    root.style.display = "none";
  }
}

/**
 * Initialise le carousel du bloc partenariat - SANS FLÈCHES (swipe natif uniquement)
 * Plus d'interactivité JS nécessaire, le scroll natif suffit
 */
function initPartnershipCarousel(itemCount) {
  // Carousel désormais entièrement natif - pas d'initialisation nécessaire
  // Le swipe horizontal fonctionne automatiquement grâce aux propriétés CSS
}

// Fonction pour mettre à jour dynamiquement le centrage des sponsors
function updatePartnershipCentering() {
  const wrap = document.querySelector(".ps-wrap");
  if (!wrap) return;

  const track = wrap.querySelector(".ps-track");
  if (!track) return;

  // Calculer si le contenu dépasse la largeur disponible
  const shouldCenter = track.scrollWidth <= track.clientWidth;

  // Appliquer ou retirer la classe ps-centered
  if (shouldCenter) {
    wrap.classList.add("ps-centered");
  } else {
    wrap.classList.remove("ps-centered");
  }
}

// ============================================
// ADDED: GESTION AUTHENTIFICATION (simulation locale)
// ============================================

const AUTH_SESSION_KEY = "lmdl_auth_session";
// Toutes les clés sont déjà définies dans window.LMD.storageKeys

/**
 * ADDED: Récupère la session d'authentification actuelle
 * @returns {Object|null} - Session { email, ts } ou null
 */
function getAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (session && session.email && session.ts) {
        return session;
      }
    }
  } catch (e) {
    console.warn("Erreur lors de la lecture de la session:", e);
  }
  return null;
}

/**
 * ADDED: Crée une session d'authentification
 * @param {string} email - Email de l'utilisateur
 */
function createAuthSession(email) {
  try {
    const session = {
      email: email,
      ts: Date.now(),
    };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error("Erreur lors de la création de la session:", e);
  }
}

/**
 * ADDED: Supprime la session d'authentification
 */
function clearAuthSession() {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch (e) {
    console.error("Erreur lors de la suppression de la session:", e);
  }
}

/**
 * ADDED: Récupère les utilisateurs depuis localStorage
 * @returns {Array} - Tableau des utilisateurs
 */
function getUsersData() {
  try {
    const raw = localStorage.getItem(window.LMD.storageKeys.users);
    if (raw) {
      const users = JSON.parse(raw);
      if (Array.isArray(users)) {
        return users;
      }
    }
  } catch (e) {
    console.warn("Erreur lors de la lecture des utilisateurs:", e);
  }
  return [];
}

/**
 * ADDED: Sauvegarde les utilisateurs dans localStorage
 * @param {Array} users - Tableau des utilisateurs
 */
function saveUsersData(users) {
  try {
    localStorage.setItem(window.LMD.storageKeys.users, JSON.stringify(users));
  } catch (e) {
    console.error("Erreur lors de la sauvegarde des utilisateurs:", e);
  }
}

/**
 * ADDED: Hash simple d'un mot de passe (pour la démo)
 * @param {string} password - Mot de passe en clair
 * @returns {string} - Hash simple
 */
function simpleHash(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * ADDED: Affiche une erreur de formulaire
 * @param {string} fieldId - ID du champ
 * @param {string} message - Message d'erreur
 */
function showFormError(fieldId, message) {
  const errorEl = document.getElementById(`error-${fieldId}`);
  const inputEl = document.getElementById(fieldId);
  if (errorEl) {
    errorEl.textContent = message || "";
    errorEl.style.display = message ? "block" : "none";
  }
  if (inputEl) {
    if (message) {
      inputEl.style.borderColor = "#f87171";
    } else {
      inputEl.style.borderColor = "var(--color-border)";
    }
  }
}

/**
 * ADDED: Efface une erreur de formulaire
 * @param {string} fieldId - ID du champ
 */
function clearFormError(fieldId) {
  showFormError(fieldId, "");
}

/**
 * ADDED: Valide un email
 * @param {string} email - Email à valider
 * @returns {boolean} - true si valide
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * ADDED: Helper pour récupérer l'URL de redirection sécurisée depuis les paramètres d'URL
 */
function getNextUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const next = urlParams.get("next") || urlParams.get("redirect"); // PATCH: Supporter aussi 'redirect'

  // Whitelist des pages autorisées
  const allowedPages = ["admin.html"];

  if (next && allowedPages.includes(next)) {
    return next;
  }

  return "index.html";
}

/**
 * ADDED: Gère la soumission du formulaire de connexion
 */
async function handleLoginSubmit(e) {
  e.preventDefault();

  // Attendre Firebase avant de procéder
  const fb = await waitForFirebase(5, 50);
  if (!fb) {
    console.warn("[AUTH] Firebase indisponible pour login");
    alert("Service d'authentification indisponible. Veuillez réessayer.");
    return;
  }

  const form = e.target;
  const identifier = toText(
    form.querySelector("#login-identifier").value,
  ).trim();
  const password = toText(form.querySelector("#login-password").value);

  // Effacer les erreurs précédentes
  clearFormError("login-identifier");
  clearFormError("login-password");

  let hasError = false;

  // Validation identifiant (email ou pseudo)
  if (!identifier) {
    showFormError("login-identifier", "L'email ou le pseudo est obligatoire");
    hasError = true;
  }

  // Validation mot de passe
  if (!password) {
    showFormError("login-password", "Le mot de passe est obligatoire");
    hasError = true;
  }

  if (hasError) {
    return;
  }

  // Désactiver le bouton pendant la connexion
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Connexion en cours...";

  // Configurer la persistance selon la checkbox "Se souvenir de moi"
  const rememberMe = document.getElementById('login-remember')?.checked;
  const persistence = rememberMe ? window.fb.browserLocalPersistence : window.fb.browserSessionPersistence;

  console.log(`[AUTH DEBUG] Login attempt - persistence: ${rememberMe ? 'local' : 'session'}, page: ${location.pathname}`);

  // Appliquer la persistance et faire la connexion
  window.fb.setPersistence(window.fb.auth, persistence)
    .then(() => {
      console.log(`[AUTH DEBUG] Persistence set to ${rememberMe ? 'local' : 'session'}`);
      // Maintenant faire la connexion
      return window.fb.signInWithEmailAndPassword(window.fb.auth, identifier, password);
    })
    .then((userCredential) => {
      console.log(`[AUTH DEBUG] Login successful - user: ${userCredential.user.email}, page: ${location.pathname}`);
      // Connexion réussie
      const nextUrl = getNextUrl();
      window.location.href = nextUrl;
    })
    .catch((error) => {
      // Réactiver le bouton
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;

      // Gérer les erreurs Firebase
      let errorMessage = "Erreur de connexion";

      switch (error.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          errorMessage = "Email ou mot de passe incorrect";
          showFormError("login-identifier", errorMessage);
          break;
        case "auth/invalid-email":
          errorMessage = "Format d'email invalide";
          showFormError("login-identifier", errorMessage);
          break;
        case "auth/too-many-requests":
          errorMessage = "Trop de tentatives, réessayez plus tard";
          showFormError("login-identifier", errorMessage);
          break;
        default:
          console.error("Erreur Firebase:", error);
          showFormError("login-identifier", errorMessage);
      }
    });
}

/**
 * ADDED: Gère la soumission du formulaire d'inscription
 */
async function handleSignupSubmit(e) {
  e.preventDefault();

  // Attendre Firebase avant de procéder
  const fb = await waitForFirebase(5, 50);
  if (!fb) {
    console.warn("[AUTH] Firebase indisponible pour signup");
    alert("Service d'authentification indisponible. Veuillez réessayer.");
    return;
  }

  const form = e.target;
  const pseudo = toText(form.querySelector("#signup-pseudo").value).trim();
  const email = toText(form.querySelector("#signup-email").value).trim();
  const password = toText(form.querySelector("#signup-password").value);
  const passwordConfirm = toText(
    form.querySelector("#signup-password-confirm").value,
  );

  // Effacer les erreurs précédentes
  clearFormError("signup-pseudo");
  clearFormError("signup-email");
  clearFormError("signup-password");
  clearFormError("signup-password-confirm");

  let hasError = false;

  // Validation pseudo
  if (!pseudo) {
    showFormError("signup-pseudo", "Le pseudo est obligatoire");
    hasError = true;
  } else if (pseudo.length < 3) {
    showFormError(
      "signup-pseudo",
      "Le pseudo doit contenir au moins 3 caractères",
    );
    hasError = true;
  }

  // Validation email
  if (!email) {
    showFormError("signup-email", "L'email est obligatoire");
    hasError = true;
  } else if (!isValidEmail(email)) {
    showFormError("signup-email", "Format d'email invalide");
    hasError = true;
  }

  // Validation mot de passe
  if (!password) {
    showFormError("signup-password", "Le mot de passe est obligatoire");
    hasError = true;
  } else if (password.length < 6) {
    showFormError(
      "signup-password",
      "Le mot de passe doit contenir au moins 6 caractères",
    );
    hasError = true;
  }

  // Validation confirmation mot de passe
  if (!passwordConfirm) {
    showFormError("signup-password-confirm", "La confirmation est obligatoire");
    hasError = true;
  } else if (password !== passwordConfirm) {
    showFormError(
      "signup-password-confirm",
      "Les mots de passe ne correspondent pas",
    );
    hasError = true;
  }

  if (hasError) {
    return;
  }

  // Désactiver le bouton pendant l'inscription
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Inscription en cours...";

  // Utiliser Firebase pour créer le compte
  window.fb
    .createUserWithEmailAndPassword(window.fb.auth, email, password)
    .then((userCredential) => {
      // Inscription réussie - rediriger vers admin.html
      window.location.href = "admin.html";
    })
    .catch((error) => {
      // Réactiver le bouton
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;

      // Gérer les erreurs Firebase
      let errorMessage = "Erreur lors de l'inscription";

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Cet email est déjà utilisé";
          showFormError("signup-email", errorMessage);
          break;
        case "auth/invalid-email":
          errorMessage = "Format d'email invalide";
          showFormError("signup-email", errorMessage);
          break;
        case "auth/weak-password":
          errorMessage = "Le mot de passe est trop faible";
          showFormError("signup-password", errorMessage);
          break;
        case "auth/operation-not-allowed":
          errorMessage = "L'inscription est temporairement désactivée";
          showFormError("signup-email", errorMessage);
          break;
        default:
          console.error("Erreur Firebase:", error);
          showFormError("signup-email", errorMessage);
      }
    });
}

/**
 * ADDED: Met à jour l'affichage des boutons d'authentification sur index.html
 */
/**
 * ÉTAT GLOBAL D'AUTHENTIFICATION
 * CRITIQUE: Toute redirection doit attendre que authResolved = true
 */
let authResolved = false;
let currentUser = null;

/**
 * LOGIQUE DE REDIRECTION CENTRALISÉE
 * N'exécute les redirections que quand Firebase a confirmé l'état auth
 */
function handleAuthRedirects(user) {
  if (!authResolved) return; // Attendre que Firebase ait confirmé l'état

  const isAdminPage = location.pathname.includes("admin.html");
  const isLoginPage = location.pathname.includes("login.html");
  const isIndexPage = location.pathname.includes("index.html") || location.pathname === "/";

  // RÈGLE 6: Cas de redirection à corriger
  if (isLoginPage && user) {
    // login.html connecté → redirect index
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    const nextUrl = redirect ? `${redirect}` : 'index.html';
    console.log(`[AUTH] User logged in on login page, redirecting to: ${nextUrl}`);
    window.location.href = nextUrl;
    return;
  }

  if (isAdminPage && !user) {
    // admin.html non connecté → redirect login
    location.href = "login.html?redirect=admin.html";
    return;
  }

  if (isAdminPage && user && !isAllowedAdmin(user.email)) {
    // admin.html connecté non admin → redirect index
    console.warn("[AUTH] Admin access denied for", user.email);
    alert("Accès administrateur refusé. Vous n'êtes pas autorisé à accéder à cette page.");
    location.href = "index.html";
    return;
  }

  // index.html connecté → OK (pas de redirection nécessaire)
}

/**
 * CRÉE UN COMPOSANT AVATAR CLIQUABLE AVEC INITIALE
 */
function createUserAvatar(user) {
  // Déterminer l'initiale (priorité: pseudo/displayName > email[0])
  let initial = '?';
  if (user.displayName && user.displayName.trim()) {
    initial = user.displayName.trim()[0].toUpperCase();
  } else if (user.email) {
    initial = user.email[0].toUpperCase();
  }

  const avatar = document.createElement('div');
  avatar.className = 'user-avatar';
  avatar.setAttribute('role', 'button');
  avatar.setAttribute('tabindex', '0');
  avatar.setAttribute('aria-label', 'Menu utilisateur');
  avatar.setAttribute('data-user-trigger', 'true'); // Attribut pour identifier le trigger
  avatar.innerHTML = `<span class="user-avatar__initial">${initial}</span>`;

  return avatar;
}

/**
 * CRÉE LE MENU DROPDOWN UTILISATEUR
 */
function createUserMenu(user) {
  const menu = document.createElement('div');
  menu.className = 'user-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('data-user-menu', 'true'); // Attribut pour identifier le menu
  menu.innerHTML = `
    <button class="user-menu__item" data-action="profile" role="menuitem">
      <span class="user-menu__icon">👤</span>
      Modifier le profil
    </button>
    <button class="user-menu__item" data-action="settings" role="menuitem">
      <span class="user-menu__icon">⚙️</span>
      Paramètres
    </button>
    <div class="user-menu__separator"></div>
    <button class="user-menu__item user-menu__item--danger" data-action="logout" role="menuitem">
      <span class="user-menu__icon">🚪</span>
      Se déconnecter
    </button>
  `;

  return menu;
}

// Variable globale pour tracker le menu ouvert
let currentUserMenu = null;

// Fonctions de portal supprimées - on utilise maintenant position:absolute relative

// Fonction getAbsolutePosition supprimée - plus nécessaire avec position:absolute relative

// Fonction de positionnement supprimée - maintenant géré par CSS position:absolute

/**
 * GÈRE L'OUVERTURE/FERMETURE DU MENU UTILISATEUR (VERSION PORTAL)
 */
function toggleUserMenu(avatar, menu, user) {
  const isOpen = menu.classList.contains('user-menu--open');

  if (isOpen) {
    closeUserMenu(menu);
  } else {
    openUserMenu(avatar, menu, user);
  }
}

function openUserMenu(avatar, menu, user) {
  // Fermer tout menu ouvert existant
  if (currentUserMenu && currentUserMenu !== menu) {
    closeUserMenu(currentUserMenu);
  }

  // Le menu reste dans son wrapper parent avec position:absolute
  menu.classList.add('user-menu--open');
  avatar.setAttribute('aria-expanded', 'true');
  currentUserMenu = menu;

  // Focus sur le premier élément
  const firstItem = menu.querySelector('[role="menuitem"]');
  if (firstItem) firstItem.focus();

  // Gestion des événements du menu
  setupMenuEvents(menu, avatar, user);
}

function closeUserMenu(menu) {
  if (!menu) return;

  menu.classList.remove('user-menu--open');

  // Remettre l'aria-expanded à false sur l'avatar associé
  const avatar = document.querySelector('.user-avatar[aria-expanded="true"]');
  if (avatar) {
    avatar.setAttribute('aria-expanded', 'false');
    avatar.focus();
  }

  if (currentUserMenu === menu) {
    currentUserMenu = null;
  }

  // Nettoyer les événements
  cleanupMenuEvents(menu);
}

function setupMenuEvents(menu, avatar, user) {
  // Gestion des clics sur les items du menu
  const handleMenuClick = (e) => {
    const action = e.target.closest('[data-action]')?.getAttribute('data-action');
    if (!action) return;

    switch (action) {
      case 'profile':
        e.preventDefault();
        alert('Fonctionnalité "Modifier le profil" bientôt disponible');
        closeUserMenu(menu);
        break;
      case 'settings':
        e.preventDefault();
        alert('Fonctionnalité "Paramètres" bientôt disponible');
        closeUserMenu(menu);
        break;
      case 'logout':
        e.preventDefault();
        handleUserLogout();
        closeUserMenu(menu);
        break;
    }
  };

  // Fermeture au clic extérieur
  const handleOutsideClick = (e) => {
    if (!menu.contains(e.target) && !avatar.contains(e.target)) {
      closeUserMenu(menu);
    }
  };

  // Fermeture avec Escape
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeUserMenu(menu);
    }
  };

  // Fermeture avec Tab (sortie du menu)
  const handleTab = (e) => {
    if (e.key === 'Tab') {
      const menuItems = menu.querySelectorAll('[role="menuitem"]');
      const firstItem = menuItems[0];
      const lastItem = menuItems[menuItems.length - 1];

      if (e.shiftKey) {
        // Shift+Tab sur le premier item → fermer
        if (document.activeElement === firstItem) {
          e.preventDefault();
          closeUserMenu(menu);
        }
      } else {
        // Tab sur le dernier item → fermer
        if (document.activeElement === lastItem) {
          e.preventDefault();
          closeUserMenu(menu);
        }
      }
    }
  };

  // Stocker les références pour cleanup
  menu._menuClickHandler = handleMenuClick;
  menu._outsideClickHandler = handleOutsideClick;
  menu._escapeHandler = handleEscape;
  menu._tabHandler = handleTab;

  menu.addEventListener('click', handleMenuClick);
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleEscape);
  document.addEventListener('keydown', handleTab);
}

function cleanupMenuEvents(menu) {
  if (menu._menuClickHandler) {
    menu.removeEventListener('click', menu._menuClickHandler);
  }
  if (menu._outsideClickHandler) {
    document.removeEventListener('click', menu._outsideClickHandler);
  }
  if (menu._escapeHandler) {
    document.removeEventListener('keydown', menu._escapeHandler);
  }
  if (menu._tabHandler) {
    document.removeEventListener('keydown', menu._tabHandler);
  }
}

/**
 * GÈRE LA DÉCONNEXION UTILISATEUR (RÉUTILISE LA LOGIQUE EXISTANTE)
 */
function handleUserLogout() {
  waitForFirebase(5, 50) // Court délai pour logout
    .then((fb) => {
      if (fb && fb.signOut) {
        fb.signOut(fb.auth)
          .then(() => {
            console.log("[AUTH] Déconnexion réussie");
            // Nettoyer l'état et forcer redirection login
            authResolved = false;
            currentUser = null;
            window.location.href = "login.html";
          })
          .catch((error) => {
            console.error("[AUTH] Erreur lors de la déconnexion:", error);
            // Fallback en cas d'erreur
            authResolved = false;
            currentUser = null;
            window.location.reload();
          });
      }
    })
    .catch(() => {
      console.warn("[AUTH] Firebase indisponible pour logout - fallback");
      // Fallback sans Firebase
      authResolved = false;
      currentUser = null;
      window.location.href = "login.html";
    });
}

/**
 * CRÉE OU RÉCUPÈRE LE CONTENEUR D'AUTHENTIFICATION DANS LE HEADER
 */
function getOrCreateAuthHost() {
  // Essayer de trouver le conteneur existant
  let host = document.getElementById("headerAuthButtons");

  if (host) {
    return host;
  }

  // Si pas trouvé, essayer de le créer dans .header-top ou header
  const headerTop = document.querySelector('.header-top');
  if (headerTop) {
    // Créer le conteneur et l'insérer avant le burger menu
    host = document.createElement('div');
    host.id = 'headerAuthButtons';
    host.className = 'header-buttons';

    const burgerMenu = headerTop.querySelector('.nav-burger, .nav-toggle');
    if (burgerMenu) {
      headerTop.insertBefore(host, burgerMenu);
    } else {
      headerTop.appendChild(host);
    }

    return host;
  }

  // Fallback: créer dans header
  const header = document.querySelector('header');
  if (header) {
    host = document.createElement('div');
    host.id = 'headerAuthButtons';
    host.className = 'header-buttons';
    host.style.cssText = `
      position: absolute;
      top: 50%;
      right: 40px;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    `;
    header.appendChild(host);
    return host;
  }

  // Dernier fallback: créer en haut à droite du body
  host = document.createElement('div');
  host.id = 'headerAuthButtons';
  host.className = 'header-buttons';
  host.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  `;
  document.body.appendChild(host);

  console.warn('[AUTH] Conteneur auth créé en fallback dans body');
  return host;
}

/**
 * MISE À JOUR DE L'UI APRÈS RÉSOLUTION AUTH
 */
function updateAuthUI(user) {
  if (!authResolved) return;

  const authButtonsContainer = getOrCreateAuthHost();
  if (!authButtonsContainer) return;

  // Gestion de la visibilité des boutons statiques login/signup
  const loginButtons = document.querySelectorAll('a[href="login.html"]');
  const signupButtons = document.querySelectorAll('a[href="signup.html"]');

  // Nettoyer tout contenu existant
  authButtonsContainer.innerHTML = '';

  if (user) {
    // Utilisateur connecté - cacher les boutons login/signup
    loginButtons.forEach(btn => btn.style.display = 'none');
    signupButtons.forEach(btn => btn.style.display = 'none');

    // Créer un conteneur interne avec position relative pour le dropdown
    const authInnerContainer = document.createElement('div');
    authInnerContainer.className = 'header-auth-inner';
    authInnerContainer.style.cssText = `
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    `;

    // Bouton Admin uniquement pour les admins
    const isAdmin = isAllowedAdmin(user.email);
    if (isAdmin) {
      const adminButton = document.createElement('a');
      adminButton.href = 'admin.html';
      adminButton.className = 'btn btn-outline';
      adminButton.style.cssText = 'font-size: 0.875em;';
      adminButton.textContent = 'Admin';
      authInnerContainer.appendChild(adminButton);
    }

    // Créer l'avatar
    const avatar = createUserAvatar(user);

    // Créer le menu (position absolute par rapport au conteneur)
    const menu = createUserMenu(user);

    // Gestionnaire de clic sur l'avatar
    avatar.addEventListener('click', () => toggleUserMenu(avatar, menu, user));
    avatar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleUserMenu(avatar, menu, user);
      }
    });

    // Wrapper pour l'avatar avec position relative
    const avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'user-avatar-wrapper';
    avatarWrapper.style.cssText = `
      position: relative;
    `;
    avatarWrapper.appendChild(avatar);
    avatarWrapper.appendChild(menu); // Menu reste dans le wrapper pour position:absolute

    authInnerContainer.appendChild(avatarWrapper);
    authButtonsContainer.appendChild(authInnerContainer);

  } else {
    // Utilisateur non connecté - afficher les boutons login/signup
    loginButtons.forEach(btn => btn.style.display = 'inline-flex');
    signupButtons.forEach(btn => btn.style.display = 'inline-flex');

    authButtonsContainer.innerHTML = `
      <a href="login.html" class="btn btn-outline" style="font-size: 0.875em;">Se connecter</a>
      <a href="signup.html" class="btn btn-primary" style="font-size: 0.875em;">S'inscrire</a>
    `;
  }
}

// ADDED: Initialisation des formulaires d'authentification
if (document.getElementById("loginForm")) {
  document
    .getElementById("loginForm")
    .addEventListener("submit", handleLoginSubmit);

  // Effacer les erreurs à la saisie
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  if (loginEmail) {
    loginEmail.addEventListener("input", () => clearFormError("login-email"));
  }
  if (loginPassword) {
    loginPassword.addEventListener("input", () =>
      clearFormError("login-password"),
    );
  }
}

if (document.getElementById("signupForm")) {
  document
    .getElementById("signupForm")
    .addEventListener("submit", handleSignupSubmit);

  // Effacer les erreurs à la saisie
  const signupPseudo = document.getElementById("signup-pseudo");
  const signupEmail = document.getElementById("signup-email");
  const signupPassword = document.getElementById("signup-password");
  const signupPasswordConfirm = document.getElementById(
    "signup-password-confirm",
  );

  if (signupPseudo) {
    signupPseudo.addEventListener("input", () =>
      clearFormError("signup-pseudo"),
    );
  }
  if (signupEmail) {
    signupEmail.addEventListener("input", () => clearFormError("signup-email"));
  }
  if (signupPassword) {
    signupPassword.addEventListener("input", () =>
      clearFormError("signup-password"),
    );
  }
  if (signupPasswordConfirm) {
    signupPasswordConfirm.addEventListener("input", () =>
      clearFormError("signup-password-confirm"),
    );
  }
}

// NOTE: Auth UI maintenant gérée centralement par initAuthRoutingAndUI

// ADDED: Liste des emails autorisés pour admin.html
const ADMIN_EMAILS = [
  "lermitedunet@gmail.com",
  "pingon.yanis58@gmail.com",
  "samtou.atake@gmail.com",
];

/**
 * ADDED: Vérifie si un email est autorisé à accéder à l'admin
 * @param {string} email - Email à vérifier
 * @returns {boolean} - true si autorisé
 */
function isAllowedAdmin(email) {
  return email && ADMIN_EMAILS.includes(email);
}

/**
 * FONCTION ROBUSTE POUR ATTENDRE FIREBASE
 * Retry jusqu'à 20 fois (2 secondes max) pour éviter les problèmes de timing
 */
let firebaseWarningLogged = false; // Flag pour éviter les logs répétés
function waitForFirebase(maxRetries = 20, interval = 100) {
  return new Promise((resolve) => {
    let attempts = 0;

    const checkFirebase = () => {
      attempts++;
      const fb = window.fb;

      if (fb && typeof fb.onAuthStateChanged === "function") {
        resolve(fb);
        return;
      }

      if (attempts >= maxRetries) {
        if (!firebaseWarningLogged) {
          console.warn("[AUTH] Firebase indisponible après", maxRetries * interval, "ms - fallback UI activé");
          firebaseWarningLogged = true;
        }
        resolve(null); // Fallback sans Firebase
        return;
      }

      setTimeout(checkFirebase, interval);
    };

    checkFirebase();
  });
}

/**
 * INITIALISATION CENTRALISÉE DE L'AUTHENTIFICATION
 * UN SEUL onAuthStateChanged pour éviter les conflits
 */
async function initAuthRoutingAndUI() {
  const fb = await waitForFirebase();

  if (!fb) {
    // Fallback UI pour utilisateurs non connectés
    const authButtonsContainer = getOrCreateAuthHost();
    if (authButtonsContainer) {
      authButtonsContainer.innerHTML = `
        <a href="login.html" class="btn btn-outline" style="font-size: 0.875em;">Se connecter</a>
        <a href="signup.html" class="btn btn-primary" style="font-size: 0.875em;">S'inscrire</a>
      `;
    }
    return;
  }

  // UN SEUL LISTENER onAuthStateChanged (RÈGLE 1 et 3)
  fb.onAuthStateChanged(fb.auth, (user) => {
    console.log(`[AUTH] onAuthStateChanged - user: ${user?.email || 'null'}, page: ${location.pathname}, authResolved: ${authResolved}`);

    // RÈGLE 4: Marquer que l'état auth est résolu
    authResolved = true;
    currentUser = user;

    // RÈGLE 1 et 4: Les redirections attendent authResolved = true
    handleAuthRedirects(user);

    // Mise à jour de l'UI après résolution auth
    updateAuthUI(user);
  });
}

// ADDED: Appel safe de l'initialisation auth
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthRoutingAndUI);
} else {
  initAuthRoutingAndUI();
}
