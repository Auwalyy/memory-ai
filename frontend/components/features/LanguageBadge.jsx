import { Badge } from '@/components/ui/badge';
import { LANGUAGE_COLORS } from '@/lib/constants';

export function LanguageBadge({ language, className = '' }) {
  return (
    <Badge className={`text-xs ${LANGUAGE_COLORS[language] || 'bg-gray-100 text-gray-800'} ${className}`}>
      {language}
    </Badge>
  );
}
