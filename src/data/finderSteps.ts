import type { FinderStep } from '../types/finder';

export const finderSteps: FinderStep[] = [
  {
    id: 'ride-environment',
    question: 'Where do you want to ride?',
    options: [
      {
        id: 'open-road',
        title: 'Open road',
        caption: 'Long miles mostly on pavement',
        image: '/images/open-road.svg',
      },
      {
        id: 'trails',
        title: 'Trails',
        caption: 'Mountain biking, trails, jumps & off-road',
        image: '/images/trails.svg',
      },
      {
        id: 'city',
        title: 'Cities, neighborhoods, around town',
        caption: 'Suburban & city streets, established bike paths',
        image: '/images/city.svg',
      },
      {
        id: 'gravel',
        title: 'Gravel roads',
        caption: 'Gravel is your go-to',
        image: '/images/gravel.svg',
      },
    ],
  },
  {
    id: 'assist-priority',
    question: 'What kind of support matters most?',
    options: [
      {
        id: 'range',
        title: 'Longer range',
        caption: 'More miles between charges',
        image: '/images/open-road.svg',
      },
      {
        id: 'power',
        title: 'Extra power',
        caption: 'More help on hills and rough terrain',
        image: '/images/trails.svg',
      },
      {
        id: 'comfort',
        title: 'Everyday comfort',
        caption: 'A smooth, practical ride for daily use',
        image: '/images/city.svg',
      },
      {
        id: 'versatility',
        title: 'Mixed surfaces',
        caption: 'Confidence when pavement turns to gravel',
        image: '/images/gravel.svg',
      },
    ],
  },
];
