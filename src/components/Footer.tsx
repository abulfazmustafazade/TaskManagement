import { useI18n } from '@/i18n';

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-card border-t border-border py-2 px-6 flex-shrink-0">
      <div className="flex items-center justify-center">
        <p className="text-xs text-muted-foreground">
          {t.app.footer} — {t.app.name}
        </p>
      </div>
    </footer>
  );
}
