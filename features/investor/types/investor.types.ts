/**
 * Investor Type Definitions
 */

export interface InvestorProfile {
  id: string;
  name: string;
  firm: string;
  title: string;
  location: string;
  focus: string[];
  checkSize: string;
  stage: string[];
  responseRate: number;
  portfolio: string[];
  thesis: string;
}
