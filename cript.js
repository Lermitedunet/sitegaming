warning: in the working copy of 'script.js', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/script.js b/script.js[m
[1mindex 3decfd1..10ace49 100644[m
[1m--- a/script.js[m
[1m+++ b/script.js[m
[36m@@ -7605,6 +7605,8 @@[m [mfunction saveArticlesOverride(nextArticles) {[m
 /**[m
  * ADDED: Source de vérité unique pour les données d'articles (admin + pages publiques)[m
  */[m
[32m+[m[32m// Fonctions slugify, ensureUniqueSlug et getArticleUrl existent déjà dans le code[m
[32m+[m
 function getArticlesData() {[m
   const override = getArticlesOverride();[m
   const articles = override || window.BASE_ARTICLES || [];[m
[36m@@ -16013,16 +16015,23 @@[m [mfunction renderArticlePage() {[m
     document.head.appendChild(metaDesc);[m
   }[m
 [m
[32m+[m[32m  // ADDED: Extraire les blocs de contenu de manière robuste[m
[32m+[m[32m  const blocks =[m
[32m+[m[32m    Array.isArray(article.contentBlocks) ? article.contentBlocks :[m
[32m+[m[32m    Array.isArray(article.blocks) ? article.blocks :[m
[32m+[m[32m    Array.isArray(article.content) ? article.content :[m
[32m+[m[32m    null;[m
[32m+[m
   // ADDED: Description depuis excerpt, summary, premier bloc texte, ou fallback[m
   let descriptionText = excerpt || article.summary || "";[m
   if ([m
     !descriptionText &&[m
[31m-    contentBlocks &&[m
[31m-    Array.isArray(contentBlocks) &&[m
[31m-    contentBlocks.length > 0[m
[32m+[m[32m    blocks &&[m
[32m+[m[32m    Array.isArray(blocks) &&[m
[32m+[m[32m    blocks.length > 0[m
   ) {[m
     // Chercher le premier bloc texte[m
[31m-    const firstTextBlock = contentBlocks.find([m
[32m+[m[32m    const firstTextBlock = blocks.find([m
       (block) => block.type === "text" && block.text,[m
     );[m
     if (firstTextBlock) {[m
[36m@@ -16124,7 +16133,9 @@[m [mfunction renderArticlePage() {[m
     if (linkImage) return linkImage;[m
 [m
     // 2) chercher dans blocks[m
[31m-    const blocks = article?.contentBlocks || article?.blocks || [];[m
[32m+[m[32m    const blocks = Array.isArray(article?.contentBlocks) ? article.contentBlocks :[m
[32m+[m[32m                   Array.isArray(article?.blocks) ? article.blocks :[m
[32m+[m[32m                   Array.isArray(article?.content) ? article.content : [];[m
     const offer =[m
       blocks.find((b) => {[m
         const t = (b?.type || "").toLowerCase();[m
[36m@@ -16146,7 +16157,7 @@[m [mfunction renderArticlePage() {[m
       offer.link?.mediaUrl,[m
     ].filter((v) => typeof v === "string" && v.trim());[m
 [m
[31m-    // CHECKPOINT C: Log resolveOfferImage[m
[32m+[m[32m    // Résoudre l'image de l'offre[m
 [m
     if (candidates.length) return candidates[0].trim();[m
 [m
[36m@@ -16164,7 +16175,9 @@[m [mfunction renderArticlePage() {[m
             return l.imageUrl.trim();[m
           if (typeof l.image === "string" && l.image.trim())[m
             return l.image.trim();[m
[31m-          const bs = a.contentBlocks || a.blocks || [];[m
[32m+[m[32m          const bs = Array.isArray(a.contentBlocks) ? a.contentBlocks :[m
[32m+[m[32m                      Array.isArray(a.blocks) ? a.blocks :[m
[32m+[m[32m                      Array.isArray(a.content) ? a.content : [];[m
           const ob =[m
             bs.find([m
               (b) =>[m
[36m@@ -17531,6 +17544,11 @@[m [mfunction initPublicPages() {[m
   // ADDED: Rendre les articles sur index.html[m
   renderHomeArticles();[m
 [m
[32m+[m[32m  // ADDED: Initialiser la page article[m
[32m+[m[32m  if (window.location.pathname.includes("article.html")) {[m
[32m+[m[32m    renderArticlePage();[m
[32m+[m[32m  }[m
[32m+[m
   // ADDED: Initialiser la page contact[m
   if (window.location.pathname.includes("contact.html")) {[m
     initContactPage();[m
[36m@@ -18654,6 +18672,78 @@[m [mif (document.readyState === "loading") {[m
   initApp();[m
 }[m
 [m
[32m+[m[32m// ============================================[m
[32m+[m[32m// RENDU DYNAMIQUE DE LA PAGE ARTICLE[m
[32m+[m[32m// ============================================[m
