export interface Deck {
  id: string;
  name: string;
  isFavorite: boolean;
}

export interface DeckWithCount {
  deck: Deck;
  newCount: number;
  learningCount: number;
  reviewCount: number;
}
