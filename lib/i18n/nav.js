// SiteNav's own hardcoded member-session strings (Members Login, Dashboard,
// Profile, Events, Sign out, Member fallback name, menu aria-labels). These
// live outside any single page's dictionary since SiteNav is shared across
// every translated page.
export const navT = {
  en: {
    memberFallback: 'Member',
    dashboard: 'Dashboard',
    profile: 'Profile',
    events: 'Events',
    signOut: 'Sign out',
    membersLogin: 'Members Login',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    becomeMember: 'Become a Member',
    navLinks: [
      { href: '/',         label: 'Home'    },
      { href: '/routes',   label: 'Routes'  },
      { href: '/#events',  label: 'Events'  },
      { href: '/#contact', label: 'Contact' },
      { href: '/faq',      label: 'FAQ'     },
    ],
  },
  fr: {
    memberFallback: 'Membre',
    dashboard: 'Tableau de bord',
    profile: 'Profil',
    events: 'Événements',
    signOut: 'Se déconnecter',
    membersLogin: 'Connexion membres',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    becomeMember: 'Devenir membre',
    navLinks: [
      { href: '/',         label: 'Accueil'     },
      { href: '/routes',   label: 'Routes'      },
      { href: '/#events',  label: 'Événements'  },
      { href: '/#contact', label: 'Contact'     },
      { href: '/faq',      label: 'FAQ'         },
    ],
  },
}
