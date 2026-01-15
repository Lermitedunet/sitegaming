[1mdiff --git a/script.js b/script.js[m
[1mindex ebb485b..71fd747 100644[m
[1m--- a/script.js[m
[1m+++ b/script.js[m
[36m@@ -22169,8 +22169,72 @@[m [mfunction createUserMenu(user) {[m
   return menu;[m
 }[m
 [m
[32m+[m[32m// Variable globale pour tracker le menu portal ouvert[m
[32m+[m[32mlet currentPortalMenu = null;[m
[32m+[m
[32m+[m[32m/**[m
[32m+[m[32m * CALCULE LA POSITION ABSOLUE D'UN ÉLÉMENT[m
[32m+[m[32m */[m
[32m+[m[32mfunction getAbsolutePosition(element) {[m
[32m+[m[32m  const rect = element.getBoundingClientRect();[m
[32m+[m[32m  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;[m
[32m+[m[32m  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;[m
[32m+[m
[32m+[m[32m  return {[m
[32m+[m[32m    top: rect.top + scrollTop,[m
[32m+[m[32m    left: rect.left + scrollLeft,[m
[32m+[m[32m    width: rect.width,[m
[32m+[m[32m    height: rect.height,[m
[32m+[m[32m    right: rect.right + scrollLeft,[m
[32m+[m[32m    bottom: rect.bottom + scrollTop[m
[32m+[m[32m  };[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m/**[m
[32m+[m[32m * POSITIONNE LE MENU PORTAL AVEC CLAMP À L'ÉCRAN[m
[32m+[m[32m */[m
[32m+[m[32mfunction positionPortalMenu(menu, avatar) {[m
[32m+[m[32m  if (!menu || !avatar) return;[m
[32m+[m
[32m+[m[32m  const avatarPos = getAbsolutePosition(avatar);[m
[32m+[m[32m  const menuRect = menu.getBoundingClientRect();[m
[32m+[m[32m  const viewportWidth = window.innerWidth;[m
[32m+[m[32m  const viewportHeight = window.innerHeight;[m
[32m+[m
[32m+[m[32m  // Debug logs[m
[32m+[m[32m  console.log('[PORTAL] Positioning menu for avatar:', avatarPos);[m
[32m+[m[32m  console.log('[PORTAL] Viewport:', viewportWidth, 'x', viewportHeight);[m
[32m+[m
[32m+[m[32m  // Position par défaut : en bas à droite de l'avatar[m
[32m+[m[32m  let top = avatarPos.bottom + 8;[m
[32m+[m[32m  let left = avatarPos.right - menuRect.width;[m
[32m+[m
[32m+[m[32m  // Clamp à droite : si dépasse à droite, aligner à gauche de l'avatar[m
[32m+[m[32m  if (left + menuRect.width > viewportWidth - 16) {[m
[32m+[m[32m    left = avatarPos.left - menuRect.width;[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  // Clamp en bas : si dépasse en bas, positionner au-dessus de l'avatar[m
[32m+[m[32m  if (top + menuRect.height > viewportHeight - 16) {[m
[32m+[m[32m    top = avatarPos.top - menuRect.height - 8;[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  // Clamp à gauche : minimum 16px du bord[m
[32m+[m[32m  left = Math.max(16, left);[m
[32m+[m
[32m+[m[32m  // Clamp en haut : minimum 16px du bord[m
[32m+[m[32m  top = Math.max(16, top);[m
[32m+[m
[32m+[m[32m  console.log('[PORTAL] Final position:', { top, left });[m
[32m+[m
[32m+[m[32m  menu.style.position = 'fixed';[m
[32m+[m[32m  menu.style.top = `${top}px`;[m
[32m+[m[32m  menu.style.left = `${left}px`;[m
[32m+[m[32m  menu.style.zIndex = '10000';[m
[32m+[m[32m}[m
[32m+[m
 /**[m
[31m- * GÈRE L'OUVERTURE/FERMETURE DU MENU UTILISATEUR[m
[32m+[m[32m * GÈRE L'OUVERTURE/FERMETURE DU MENU UTILISATEUR (VERSION PORTAL)[m
  */[m
 function toggleUserMenu(avatar, menu, user) {[m
   const isOpen = menu.classList.contains('user-menu--open');[m
[36m@@ -22183,15 +22247,25 @@[m [mfunction toggleUserMenu(avatar, menu, user) {[m
 }[m
 [m
 function openUserMenu(avatar, menu, user) {[m
[31m-  // Fermer tous les autres menus ouverts[m
[31m-  document.querySelectorAll('.user-menu--open').forEach(openMenu => {[m
[31m-    if (openMenu !== menu) {[m
[31m-      openMenu.classList.remove('user-menu--open');[m
[31m-    }[m
[31m-  });[m
[32m+[m[32m  // Fermer tout menu portal existant[m
[32m+[m[32m  if (currentPortalMenu && currentPortalMenu !== menu) {[m
[32m+[m[32m    closeUserMenu(currentPortalMenu);[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  // Ajouter le menu au body s'il n'y est pas déjà[m
[32m+[m[32m  if (!menu.parentElement || menu.parentElement !== document.body) {[m
[32m+[m[32m    document.body.appendChild(menu);[m
[32m+[m[32m    console.log('[PORTAL] Menu added to body');[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  // Calculer et appliquer la position[m
[32m+[m[32m  positionPortalMenu(menu, avatar);[m
 [m
   menu.classList.add('user-menu--open');[m
   avatar.setAttribute('aria-expanded', 'true');[m
[32m+[m[32m  currentPortalMenu = menu;[m
[32m+[m
[32m+[m[32m  console.log('[PORTAL] Menu opened, position:', menu.style.top, menu.style.left);[m
 [m
   // Focus sur le premier élément[m
   const firstItem = menu.querySelector('[role="menuitem"]');[m
[36m@@ -22202,20 +22276,28 @@[m [mfunction openUserMenu(avatar, menu, user) {[m
 }[m
 [m
 function closeUserMenu(menu) {[m
[32m+[m[32m  if (!menu) return;[m
[32m+[m
   menu.classList.remove('user-menu--open');[m
[31m-  const avatar = menu.previousElementSibling;[m
[32m+[m
[32m+[m[32m  // Remettre l'aria-expanded à false sur l'avatar associé[m
[32m+[m[32m  const avatar = document.querySelector('.user-avatar[aria-expanded="true"]');[m
   if (avatar) {[m
     avatar.setAttribute('aria-expanded', 'false');[m
     avatar.focus();[m
   }[m
 [m
[32m+[m[32m  if (currentPortalMenu === menu) {[m
[32m+[m[32m    currentPortalMenu = null;[m
[32m+[m[32m  }[m
[32m+[m
   // Nettoyer les événements[m
   cleanupMenuEvents(menu);[m
 }[m
 [m
 function setupMenuEvents(menu, avatar, user) {[m
   // Gestion des clics sur les items du menu[m
[31m-  menu.addEventListener('click', (e) => {[m
[32m+[m[32m  const handleMenuClick = (e) => {[m
     const action = e.target.closest('[data-action]')?.getAttribute('data-action');[m
     if (!action) return;[m
 [m
[36m@@ -22236,7 +22318,7 @@[m [mfunction setupMenuEvents(menu, avatar, user) {[m
         closeUserMenu(menu);[m
         break;[m
     }[m
[31m-  });[m
[32m+[m[32m  };[m
 [m
   // Fermeture au clic extérieur[m
   const handleOutsideClick = (e) => {[m
[36m@@ -22252,6 +22334,13 @@[m [mfunction setupMenuEvents(menu, avatar, user) {[m
     }[m
   };[m
 [m
[32m+[m[32m  // Repositionnement au resize/scroll[m
[32m+[m[32m  const handleReposition = () => {[m
[32m+[m[32m    if (menu.classList.contains('user-menu--open')) {[m
[32m+[m[32m      positionPortalMenu(menu, avatar);[m
[32m+[m[32m    }[m
[32m+[m[32m  };[m
[32m+[m
   // Fermeture avec Tab (sortie du menu)[m
   const handleTab = (e) => {[m
     if (e.key === 'Tab') {[m
[36m@@ -22276,22 +22365,34 @@[m [mfunction setupMenuEvents(menu, avatar, user) {[m
   };[m
 [m
   // Stocker les références pour cleanup[m
[32m+[m[32m  menu._menuClickHandler = handleMenuClick;[m
   menu._outsideClickHandler = handleOutsideClick;[m
   menu._escapeHandler = handleEscape;[m
[32m+[m[32m  menu._repositionHandler = handleReposition;[m
   menu._tabHandler = handleTab;[m
 [m
[32m+[m[32m  menu.addEventListener('click', handleMenuClick);[m
   document.addEventListener('click', handleOutsideClick);[m
   document.addEventListener('keydown', handleEscape);[m
   document.addEventListener('keydown', handleTab);[m
[32m+[m[32m  window.addEventListener('resize', handleReposition);[m
[32m+[m[32m  window.addEventListener('scroll', handleReposition, { passive: true });[m
 }[m
 [m
 function cleanupMenuEvents(menu) {[m
[32m+[m[32m  if (menu._menuClickHandler) {[m
[32m+[m[32m    menu.removeEventListener('click', menu._menuClickHandler);[m
[32m+[m[32m  }[m
   if (menu._outsideClickHandler) {[m
     document.removeEventListener('click', menu._outsideClickHandler);[m
   }[m
   if (menu._escapeHandler) {[m
     document.removeEventListener('keydown', menu._escapeHandler);[m
   }[m
[32m+[m[32m  if (menu._repositionHandler) {[m
[32m+[m[32m    window.removeEventListener('resize', menu._repositionHandler);[m
[32m+[m[32m    window.removeEventListener('scroll', menu._repositionHandler);[m
[32m+[m[32m  }[m
   if (menu._tabHandler) {[m
     document.removeEventListener('keydown', menu._tabHandler);[m
   }[m
[36m@@ -22363,8 +22464,10 @@[m [mfunction updateAuthUI(user) {[m
       authContainer.appendChild(adminButton);[m
     }[m
 [m
[31m-    // Créer l'avatar et le menu[m
[32m+[m[32m    // Créer l'avatar[m
     const avatar = createUserAvatar(user);[m
[32m+[m
[32m+[m[32m    // Créer le menu (sera géré par le système portal)[m
     const menu = createUserMenu(user);[m
 [m
     // Gestionnaire de clic sur l'avatar[m
[36m@@ -22376,15 +22479,10 @@[m [mfunction updateAuthUI(user) {[m
       }[m
     });[m
 [m
[31m-    // Assembler avatar + menu dans un wrapper positionné[m
[32m+[m[32m    // Wrapper simple pour l'avatar[m
     const avatarWrapper = document.createElement('div');[m
     avatarWrapper.className = 'user-avatar-wrapper';[m
[31m-    avatarWrapper.style.cssText = `[m
[31m-      position: relative;[m
[31m-      z-index: 50;[m
[31m-    `;[m
     avatarWrapper.appendChild(avatar);[m
[31m-    avatarWrapper.appendChild(menu);[m
 [m
     authContainer.appendChild(avatarWrapper);[m
     authButtonsContainer.appendChild(authContainer);[m
[1mdiff --git a/style.css b/style.css[m
[1mindex ebed20f..656213d 100644[m
[1m--- a/style.css[m
[1m+++ b/style.css[m
[36m@@ -1282,6 +1282,9 @@[m [mheader p {[m
     align-items: center;[m
     gap: 8px;[m
     overflow-x: auto;[m
[32m+[m[32m    overflow-y: visible;[m
[32m+[m[32m    position: relative;[m
[32m+[m[32m    z-index: 10;[m
     -webkit-overflow-scrolling: touch;[m
     backdrop-filter: blur(12px);[m
     box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);[m
[36m@@ -3286,7 +3289,7 @@[m [mfooter {[m
     /* NAVIGATION MOBILE SCROLLABLE */[m
     .main-nav {[m
         overflow-x: auto !important;[m
[31m-        overflow-y: hidden !important;[m
[32m+[m[32m        overflow-y: visible !important; /* Allow dropdown to show */[m
         white-space: nowrap !important;[m
         -webkit-overflow-scrolling: touch !important;[m
         scrollbar-width: thin !important;[m
[36m@@ -3546,9 +3549,7 @@[m [mfooter {[m
 }[m
 [m
 .user-menu {[m
[31m-    position: absolute;[m
[31m-    top: calc(100% + 8px);[m
[31m-    right: 0;[m
[32m+[m[32m    position: fixed;[m
     min-width: 200px;[m
     background: var(--color-surface);[m
     border: 1px solid var(--color-border);[m
[36m@@ -3559,7 +3560,7 @@[m [mfooter {[m
     visibility: hidden;[m
     transform: translateY(-8px);[m
     transition: all 0.2s ease;[m
[31m-    z-index: 9999;[m
[32m+[m[32m    z-index: 2147483647; /* Maximum z-index value */[m
     overflow: hidden;[m
     pointer-events: none;[m
 }[m
[36m@@ -3627,21 +3628,7 @@[m [mfooter {[m
     align-items: center;[m
 }[m
 [m
[31m-/* Assurer que les containers de header permettent l'affichage du menu */[m
[31m-.header-buttons,[m
[31m-.header-auth-container,[m
[31m-.user-avatar-wrapper {[m
[31m-    overflow: visible !important;[m
[31m-}[m
[31m-[m
[31m-/* Forcer le header à permettre les dropdowns */[m
[31m-header {[m
[31m-    overflow: visible;[m
[31m-}[m
[31m-[m
[31m-.header-top {[m
[31m-    overflow: visible;[m
[31m-}[m
[32m+[m[32m/* Le système portal rend ces règles inutiles */[m
 [m
 /* Responsive adjustments */[m
 @media (max-width: 768px) {[m
