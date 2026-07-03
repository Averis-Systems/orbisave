"""
Full ledger-chain integrity check, runnable by an operator or CI:

    python manage.py verify_ledger              # report, exit 0 even on failure
    python manage.py verify_ledger --strict     # exit 1 if any stream is broken

Walks every (group, account_stream, currency) chain across all configured
country databases via apps.ledger.services.verify_ledger_stream and reports
sequence gaps, hash-chain breaks, and running-balance drift.
"""
import json

from django.core.management.base import BaseCommand

from apps.ledger.tasks import verify_all_ledger_streams


class Command(BaseCommand):
    help = "Verify every ledger stream's hash chain, sequencing, and running balances."

    def add_arguments(self, parser):
        parser.add_argument(
            '--strict',
            action='store_true',
            help='Exit non-zero when any stream fails verification (for CI).',
        )

    def handle(self, *args, **options):
        result = verify_all_ledger_streams.apply().get()

        self.stdout.write(f"Streams checked: {result['streams_checked']}")
        if result['violations']:
            self.stderr.write(self.style.ERROR(
                f"INTEGRITY VIOLATIONS FOUND: {len(result['violations'])} stream(s)"
            ))
            self.stderr.write(json.dumps(result['violations'], indent=2, default=str))
            if options['strict']:
                raise SystemExit(1)
        else:
            self.stdout.write(self.style.SUCCESS(
                'All ledger streams verified: hash chains, sequences, and balances intact.'
            ))
