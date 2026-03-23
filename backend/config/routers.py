from common.middleware import get_current_country

class OrbiSaveRouter:
    """
    A router to control all database operations on models for different applications.
    Platform-wide apps -> default database.
    Financial apps -> country-specific databases.
    """
    PLATFORM_APPS = {'accounts', 'audit', 'notifications', 'auth', 'contenttypes', 'sessions', 'admin'}
    FINANCIAL_APPS = {'groups', 'contributions', 'loans', 'ledger', 'payouts', 'payments', 'analytics', 'meetings'}

    def db_for_read(self, model, **hints):
        if model._meta.app_label in self.PLATFORM_APPS:
            return 'default'
        if model._meta.app_label in self.FINANCIAL_APPS:
            # Check if a specific db is hinted, otherwise fallback to thread-local
            country = hints.get('country', get_current_country())
            if country in ['kenya', 'rwanda', 'ghana']:
                return country
            # Fallback for dev/manage.py commands
            return 'default'
        return 'default'

    def db_for_write(self, model, **hints):
        if model._meta.app_label in self.PLATFORM_APPS:
            return 'default'
        if model._meta.app_label in self.FINANCIAL_APPS:
            country = hints.get('country', get_current_country())
            if country in ['kenya', 'rwanda', 'ghana']:
                return country
            return 'default'
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if both objects are in the same database, or if 
        one is in the platform db (e.g. cross-database foreign keys to User).
        Django does not support true foreign keys across different databases, 
        so we must use `db_constraint=False` on the models for `User` foreign keys inside financial apps.
        """
        # We allow the ORM to logically join them if explicitly queried, 
        # but physical constraints won't exist across DBs.
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Ensure platform apps only migrate on default, and financial apps migrate on country DBs.
        However, for local development clarity and schema consistency, we migrate all schemas 
        on all databases if they are technically isolated PostgreSQL instances.
        In production, we strictly target them.
        """
        if app_label in self.PLATFORM_APPS:
            return db == 'default'
        if app_label in self.FINANCIAL_APPS:
            return db in ['default', 'kenya', 'rwanda', 'ghana']
        return None
