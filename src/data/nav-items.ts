export interface NavPopularItem {
  name: string;
  href: string;
  image: string;
}

export interface NavItem {
  title: string;
  href: string;
  popular: NavPopularItem[];
  more: string[];
  viewAllLabel: string;
}

// Navigation items based on iGeeksBlog categories
export const NAV_ITEMS: NavItem[] = [
  {
    title: 'iPhone',
    href: '/category/iphone',
    popular: [
      {
        name: 'iPhone 16',
        href: '/category/iphone',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/09/iPhone-16-Pro-and-iPhone-16-Pro-Max.jpg?wsr'
      },
      {
        name: 'iOS 18',
        href: '/category/ios',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/06/iOS-18-Features.jpg?wsr'
      },
      {
        name: 'Tips & Tricks',
        href: '/category/iphone',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/01/Best-iPhone-tips-and-tricks.jpg?wsr'
      },
      {
        name: 'Troubleshooting',
        href: '/category/iphone',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/02/How-to-fix-iPhone-not-charging.jpg?wsr'
      }
    ],
    more: ['AirPods', 'Apple Watch', 'CarPlay', 'Shortcuts', 'Siri'],
    viewAllLabel: 'View All iPhone'
  },
  {
    title: 'Mac',
    href: '/category/mac',
    popular: [
      {
        name: 'MacBook Pro',
        href: '/category/mac',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2023/11/M3-MacBook-Pro-review.jpg?wsr'
      },
      {
        name: 'macOS',
        href: '/category/macos',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/06/macOS-Sequoia-features.jpg?wsr'
      },
      {
        name: 'Mac Mini',
        href: '/category/mac',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/11/M4-Mac-mini-review.jpg?wsr'
      },
      {
        name: 'iMac',
        href: '/category/mac',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2023/11/M3-iMac-review.jpg?wsr'
      }
    ],
    more: ['Mac Studio', 'Mac Pro', 'Mac Tips', 'Mac Apps'],
    viewAllLabel: 'View All Mac'
  },
  {
    title: 'iPad',
    href: '/category/ipad',
    popular: [
      {
        name: 'iPad Pro',
        href: '/category/ipad',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/05/M4-iPad-Pro-review.jpg?wsr'
      },
      {
        name: 'iPadOS',
        href: '/category/ipados',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/06/iPadOS-18-features.jpg?wsr'
      },
      {
        name: 'iPad Air',
        href: '/category/ipad',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/05/M2-iPad-Air-review.jpg?wsr'
      },
      {
        name: 'iPad Tips',
        href: '/category/ipad',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/01/Best-iPad-tips-and-tricks.jpg?wsr'
      }
    ],
    more: ['Apple Pencil', 'Magic Keyboard', 'iPad Apps', 'iPad Accessories'],
    viewAllLabel: 'View All iPad'
  },
  {
    title: 'How To',
    href: '/category/how-to',
    popular: [
      {
        name: 'iPhone Guides',
        href: '/category/how-to',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/01/How-to-use-iPhone.jpg?wsr'
      },
      {
        name: 'Mac Guides',
        href: '/category/how-to',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/01/How-to-use-Mac.jpg?wsr'
      },
      {
        name: 'iPad Guides',
        href: '/category/how-to',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/01/How-to-use-iPad.jpg?wsr'
      },
      {
        name: 'Apple Watch Guides',
        href: '/category/how-to',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/01/How-to-use-Apple-Watch.jpg?wsr'
      }
    ],
    more: ['Shortcuts', 'Troubleshooting', 'Setup Guides', 'Tips & Tricks'],
    viewAllLabel: 'View All How To'
  },
  {
    title: 'Apps',
    href: '/category/apps',
    popular: [
      {
        name: 'Best Apps',
        href: '/category/apps',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/01/Best-iPhone-apps.jpg?wsr'
      },
      {
        name: 'Games',
        href: '/category/games',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/01/Best-iPhone-games.jpg?wsr'
      },
      {
        name: 'App Deals',
        href: '/category/apps',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/01/Best-app-deals.jpg?wsr'
      },
      {
        name: 'Mac Apps',
        href: '/category/apps',
        image: 'https://dev.igeeksblog.com/wp-content/uploads/2024/01/Best-Mac-apps.jpg?wsr'
      }
    ],
    more: ['Productivity Apps', 'Photo Apps', 'Video Apps', 'Music Apps'],
    viewAllLabel: 'View All Apps'
  },
  {
    title: 'Accessories',
    href: '/category/accessories',
    popular: [],
    more: [],
    viewAllLabel: ''
  },
  {
    title: 'News',
    href: '/category/news',
    popular: [],
    more: [],
    viewAllLabel: ''
  }
];
