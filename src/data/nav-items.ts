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

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Gaming',
    href: '#',
    popular: [
      {
        name: 'Call of Duty',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2025/11/14/Black-Ops-7-review.jpg?width=385&quality=75&format=auto'
      },
      {
        name: 'Pokemon',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2025/02/11/Pokemon-homepage-icon.jpg?width=385&quality=75&format=auto'
      },
      {
        name: 'Overwatch',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2025/02/11/overwatch-homepage-icon.jpg?width=385&quality=75&format=auto'
      },
      {
        name: 'Fortnite',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2025/02/11/fortnite-homepage-icon.jpg?width=385&quality=75&format=auto'
      }
    ],
    more: ['EA Sports FC', 'Valorant', 'Apex Legends', 'League of Legends', 'Diablo', 'Counter-Strike 2'],
    viewAllLabel: 'View All Games'
  },
  {
    title: 'TV & Movies',
    href: '#',
    popular: [
      {
        name: 'Stranger Things',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2025/12/31/Stranger-Things-Kids.jpg?width=385&quality=75&format=auto'
      },
      {
        name: 'Fallout',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2025/12/24/Fallout-Season-2-Episode-4.jpg?width=385&quality=75&format=auto'
      },
      {
        name: 'The Boys',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2024/07/18/homelander-the-boys.jpg?width=385&quality=75&format=auto'
      },
      {
        name: 'Marvel',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2024/03/11/avengers-doomsday.jpeg?width=385&quality=75&format=auto'
      }
    ],
    more: ['Netflix', 'Apple TV', 'Hulu', 'Prime Video', 'Disney+'],
    viewAllLabel: 'View All TV & Movies'
  },
  {
    title: 'Entertainment',
    href: '#',
    popular: [
      {
        name: 'YouTube',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2025/02/18/Streamer-category-thumbnails-Youtube.jpg?width=385&quality=75&format=auto'
      },
      {
        name: 'Twitch',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2025/02/18/Streamer-category-thumbnails-Twitch.jpg?width=385&quality=75&format=auto'
      },
      {
        name: 'Kick',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2025/02/18/Streamer-category-thumbnails-Kick.jpg?width=385&quality=75&format=auto'
      },
      {
        name: 'TikTok',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2025/02/18/Streamer-category-thumbnails-Tiktok.jpg?width=385&quality=75&format=auto'
      }
    ],
    more: ['Viral', 'Food', 'Social Media', 'Tech'],
    viewAllLabel: 'View All Entertainment'
  },
  {
    title: 'Esports',
    href: '#',
    popular: [
      {
        name: 'Call of Duty',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2024/07/05/CDL-Champs-OpTic-Texas.jpg?width=385&quality=75&format=auto'
      },
      {
        name: 'Valorant',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2024/09/04/VCT-champs-header-img.jpg?width=385&quality=75&format=auto'
      },
      {
        name: 'League of Legends',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2024/10/01/Faker-wins-worlds-2023.jpg?width=385&quality=75&format=auto'
      },
      {
        name: 'Counter-Strike 2',
        href: '#',
        image: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2022/07/17/FaZe-IEM-Cologne-Champs.jpg?width=385&quality=75&format=auto'
      }
    ],
    more: ['Apex Legends', 'Overwatch', 'Rocket League', 'Dota 2'],
    viewAllLabel: 'View All Esports'
  },
  {
    title: 'Wikis',
    href: '#',
    popular: [],
    more: [],
    viewAllLabel: ''
  },
  {
    title: 'Videos',
    href: '#',
    popular: [],
    more: [],
    viewAllLabel: ''
  },
  {
    title: 'More',
    href: '#',
    popular: [],
    more: [],
    viewAllLabel: ''
  }
];
