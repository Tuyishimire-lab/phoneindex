import { EditorPersonaId } from "@/lib/editors";

export interface ExpandedEditorialCard {
  editorId: EditorPersonaId;
  title: string;
  subtitle: string;
  badgeText: string;
  body: string;
  pros?: string[];
  cons?: string[];
  footerCitation?: string;
}
