/**
 * Matching & Connection Type Definitions
 */

export type ConnectionStatus = 'none' | 'pending' | 'viewed' | 'meeting-scheduled' | 'passed';

export interface ConnectionRequest {
  id: string;
  founderId: string;
  founderName: string;
  startupName: string;
  investorId: string;
  investorName: string;
  status: ConnectionStatus;
  personalMessage?: string;
  createdAt: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  meetingDate?: Date;
  feedback?: string;
}

export interface InvestorWithConnection {
  id: number;
  name: string;
  firm: string;
  location: string;
  matchScore: number;
  focus: string[];
  checkSize: string;
  stage: string[];
  responseRate: number;
  portfolio: string[];
  thesis: string;
  connectionStatus: ConnectionStatus;
  connectionRequestId?: string;
}
