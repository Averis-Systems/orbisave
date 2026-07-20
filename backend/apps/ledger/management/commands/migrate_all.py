"""
Migrate every database this platform uses, in the right order.

Why this exists
---------------
OrbiSave shards financial data per country. `manage.py migrate` on its own only
touches the `default` alias, so the country databases silently fall behind and
the failure surfaces much later as a runtime error such as
"no such column: ledger_entry.event_group_id" on an ordinary page load.

The deployment command previously looped over a HARDCODED list of six apps
(groups, contributions, loans, ledger, payouts, meetings) while the router
defines eight financial apps. `payments` and `analytics` were therefore never
migrated into the country databases at all. Any hardcoded list drifts the
moment an app is added, so this command reads the app list straight from
OrbiSaveRouter.FINANCIAL_APPS: adding a financial app automatically gets it
migrated everywhere, with no deployment script to remember to update.

Usage:
    python manage.py migrate_all
    python manage.py migrate_all --check   # report drift, change nothing
"""
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from config.routers import OrbiSaveRouter


class Command(BaseCommand):
    help = "Apply migrations to the default database and every country database."

    def add_arguments(self, parser):
        parser.add_argument(
            '--check',
            action='store_true',
            help='Report databases with unapplied migrations without applying anything.',
        )

    def _country_aliases(self):
        """Configured country aliases, skipping any not present in settings."""
        from common.db_utils import COUNTRY_DB_MAP

        aliases = []
        for alias in COUNTRY_DB_MAP.values():
            if alias != 'default' and alias in settings.DATABASES and alias not in aliases:
                aliases.append(alias)
        return aliases

    def handle(self, *args, **options):
        check_only = options['check']
        financial_apps = sorted(OrbiSaveRouter.FINANCIAL_APPS)
        country_aliases = self._country_aliases()

        if check_only:
            # --check makes `migrate` exit non-zero when anything is pending,
            # which is what a deploy gate or CI step wants.
            self.stdout.write('Checking default...')
            call_command('migrate', '--check', verbosity=0)
            for alias in country_aliases:
                self.stdout.write(f'Checking {alias}...')
                for app in financial_apps:
                    try:
                        call_command('migrate', app, '--check', database=alias, verbosity=0)
                    except CommandError as exc:
                        # Same tolerance as the apply path: an app without a
                        # migrations package is not drift.
                        if 'does not have migrations' in str(exc):
                            continue
                        raise
            self.stdout.write(self.style.SUCCESS('All databases are up to date.'))
            return

        # Platform apps (accounts, audit, notifications, sessions) live on
        # default and must exist before anything references them.
        self.stdout.write(self.style.MIGRATE_HEADING('Migrating default'))
        call_command('migrate', '--noinput')

        skipped = set()
        for alias in country_aliases:
            self.stdout.write(self.style.MIGRATE_HEADING(f'Migrating {alias}'))
            for app in financial_apps:
                try:
                    call_command('migrate', app, database=alias, interactive=False)
                except CommandError as exc:
                    # An app with no migrations package is legitimate (it simply
                    # has no tables yet). Skip it rather than aborting the whole
                    # run and leaving later databases unmigrated.
                    if 'does not have migrations' in str(exc):
                        skipped.add(app)
                        continue
                    raise

        if skipped:
            self.stdout.write(
                self.style.WARNING(
                    f"Skipped (no migrations defined): {', '.join(sorted(skipped))}. "
                    'Their models have no tables in any database. Run makemigrations '
                    'for these apps before relying on them.'
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'Migrated default and {len(country_aliases)} country database(s): '
                f"{', '.join(country_aliases)}"
            )
        )
