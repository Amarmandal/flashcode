export interface NormalDeck {
  id: number;
  name: string;
  isFavorite: boolean;
  deckCategory: string;
}

export interface NormalCard {
  id: number;
  deckId: number;
  front: string;
  back: string;
  imageData?: string;
  easeFactor: number;
  repetitions: number;
  interval: number;
  dueDate: number;
  createdAt: string;
}

export interface NormalQueuesResponse {
  cards: NormalCard[];
  new: number;
  learning: number;
  toReview: number;
}
