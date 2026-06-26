export interface FinderOption {
  id: string;
  title: string;
  caption: string;
  image: string;
}

export interface FinderStep {
  id: string;
  question: string;
  options: FinderOption[];
}
