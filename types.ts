
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

export enum AppSection {
  SDR = 'sdr',
  COPY = 'copy',
  CONTRACT = 'contract'
}

export interface Lead {
  id: string;
  name: string;
  description: string;
  rating: number;
  instagram: string;
  instagramHandle?: string;
  whatsapp: string;
  whatsappNumber?: string;
  address: string;
}

export interface CopyInput {
  userName: string;
  niche: string;
  contactName: string;
  leadProblem: string;
  solution: string;
  differential: string;
  goal: string;
  tone: 'formal' | 'casual' | 'objective';
}

export interface ContractInput {
  serviceName: string;
  providerName: string;
  providerId: string;
  clientName: string;
  clientId: string;
  value: string;
  deadline: string;
  location: string;
  date: string;
  delayFine: boolean;
  defaultFine: boolean;
  extraInfo?: string;
  logoUrl?: string;
}
