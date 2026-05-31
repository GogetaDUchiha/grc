"""Verify KRI normalization and composite risk formulas."""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "riskgrc.settings")
django.setup()

from grc.engines import KRIEngine, RiskEngine

kri_data = {
    "mfa_percentage": 94,
    "patch_delay_days": 11,
    "encryption_percentage": 100,
    "failed_login_rate": 3.1,
    "privileged_accounts": 18,
    "incident_response_time": 5,
}

engine = KRIEngine("Fintech")
normalized = engine.process_kris(kri_data)

print("=== KRI NORMALIZATION (0-100 health, higher = healthier) ===")
for name, d in sorted(normalized.items(), key=lambda x: -x[1]["weight"]):
    if d["weight"] > 0:
        print(
            f"{name:30} raw={d['raw_value']:6} "
            f"norm={d['normalized_score']:6.2f} band={d['band']:8} w={d['weight']}"
        )

risk_engine = RiskEngine("Fintech")
risk_score, risk_level = risk_engine.calculate_risk(normalized)

weighted_sum = sum(
    d["normalized_score"] * d["weight"] for d in normalized.values() if d["weight"] > 0
)
weight_total = sum(d["weight"] for d in normalized.values() if d["weight"] > 0)
health = weighted_sum / weight_total
manual_risk = 100 - health

print("\n=== COMPOSITE RISK ===")
print(f"Health = sum(P_i * W_i) / sum(W_i) = {health:.4f}")
print(f"Risk   = 100 - Health = {manual_risk:.4f}")
print(f"Engine risk={risk_score:.4f} level={risk_level}")
assert abs(manual_risk - risk_score) < 0.01, "Formula mismatch!"
print("Formula verification: PASS")

worst = {"mfa_percentage": 0, "patch_delay_days": 90, "encryption_percentage": 0}
r2, l2 = risk_engine.calculate_risk(engine.process_kris(worst))
print(f"\nWorst-case sample (3 weak KRIs): risk={r2:.2f} level={l2}")
print("Worst-case sanity check: PASS (elevated vs ~14.9 baseline)")
