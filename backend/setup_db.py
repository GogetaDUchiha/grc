import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'riskgrc.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import Organization, UserOrganization
from grc.models import Regulation

# Set up rules mimicking the viewset
rules = {
    'Fintech': [
        {'name': 'SBP Regulatory Sandbox Guidelines', 'description': 'State Bank of Pakistan Fintech regulatory guidelines', 'rules': {'mfa_coverage_min': 80, 'patch_delay_max': 15, 'encryption_coverage_min': 90}},
        {'name': 'SECP FinTech Regulations', 'description': 'Securities and Exchange Commission FinTech regulations', 'rules': {'mfa_coverage_min': 80, 'incident_response_max_hours': 12}},
        {'name': 'PTA Data Protection Guidelines', 'description': 'Pakistan Telecom Authority data protection guidelines', 'rules': {'encryption_coverage_min': 85, 'log_retention_days_min': 90}},
    ]
}

for sector, regs in rules.items():
    for reg in regs:
        Regulation.objects.get_or_create(
            sector=sector,
            name=reg['name'],
            defaults={'description': reg['description'], 'rules': reg['rules']}
        )

# Create a demo user for testing
if not User.objects.filter(username='demo').exists():
    user = User.objects.create_user('demo', 'demo@riskgrc.com', 'password123')
    org = Organization.objects.create(name='Demo Fintech Corp', sector='Fintech', owner=user)
    UserOrganization.objects.create(user=user, organization=org, role='admin')
    print("Demo user created")
else:
    print("Demo user already exists")

print("Setup complete")
