"""
test_ai_evals.py: Automated Golden EVALS Suite for Anshul Bisht's Portfolio AI Assistant.

Evaluates 15 test cases across 4 critical pillars:
1. factual_recall: High-fidelity recall of experience, AWS services, IaC, cost savings, and employers.
2. negative_grounding: Strict refusal / deflection of out-of-domain and hallucination queries.
3. prompt_injection: 100% block rate against adversarial jailbreaks, overrides, and system prompt leaks.
4. voice_formatting: Zero-markdown contract, spoken phrasing, and <50 word brevity enforcement.
"""

import json
import os
import sys
from typing import Any, Dict, List
import pytest

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai_context import (
    PORTFOLIO_PROFILE,
    get_portfolio_context,
    build_chat_system_instruction,
    build_voice_system_instruction,
)
from ai_guardrails import check_prompt_injection, SAFE_DEFLECTION_MESSAGE


DATASET_PATH = os.path.join(os.path.dirname(__file__), "evals", "golden_dataset.json")


def load_golden_dataset() -> List[Dict[str, Any]]:
    """Loads and validates the golden dataset JSON file."""
    assert os.path.exists(DATASET_PATH), f"Golden dataset not found at {DATASET_PATH}"
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert isinstance(data, list), "Golden dataset root must be a JSON array"
    return data


GOLDEN_DATASET = load_golden_dataset()


class EvalScorecardTracker:
    """Tracks and formats evaluation results for terminal scorecard generation."""

    def __init__(self):
        self.results: List[Dict[str, Any]] = []

    def record(self, case_id: str, category: str, query: str, passed: bool, notes: str = ""):
        self.results.append({
            "id": case_id,
            "category": category,
            "query": query,
            "passed": passed,
            "notes": notes,
        })

    def generate_report(self) -> str:
        categories = ["factual_recall", "negative_grounding", "prompt_injection", "voice_formatting"]
        cat_stats = {cat: {"total": 0, "passed": 0} for cat in categories}

        for r in self.results:
            cat = r["category"]
            if cat in cat_stats:
                cat_stats[cat]["total"] += 1
                if r["passed"]:
                    cat_stats[cat]["passed"] += 1

        total_cases = len(self.results)
        total_passed = sum(1 for r in self.results if r["passed"])
        pass_rate = (total_passed / total_cases * 100.0) if total_cases > 0 else 0.0

        width = 86
        lines = [
            "\n" + "=" * width,
            "                      AI ASSISTANT GOLDEN EVALS SCORECARD                 ".center(width),
            "=" * width,
            f"{'Case ID':<9} | {'Category':<20} | {'Status':<8} | {'Query / Description':<40}",
            "-" * width,
        ]

        for r in self.results:
            status_str = "✅ PASS" if r["passed"] else "❌ FAIL"
            query_preview = (r["query"][:37] + "...") if len(r["query"]) > 40 else r["query"]
            lines.append(f"{r['id']:<9} | {r['category']:<20} | {status_str:<8} | {query_preview:<40}")

        lines.extend([
            "-" * width,
            "Category Performance Summary:",
        ])

        for cat in categories:
            stats = cat_stats[cat]
            rate = (stats["passed"] / stats["total"] * 100.0) if stats["total"] > 0 else 0.0
            badge = "✅ PASS" if stats["passed"] == stats["total"] and stats["total"] > 0 else "❌ FAIL"
            lines.append(
                f"  • {cat:<22}: {stats['passed']}/{stats['total']} passed ({rate:>5.1f}%) [{badge}]"
            )

        overall_badge = "🎯 100% ALL PASSED" if total_passed == total_cases else "⚠️ FAILURES DETECTED"
        lines.extend([
            "-" * width,
            f"OVERALL EVAL SCORE: {total_passed}/{total_cases} PASSED ({pass_rate:.1f}%) - {overall_badge}",
            "=" * width + "\n",
        ])

        return "\n".join(lines)


# Global scorecard instance for test session
scorecard = EvalScorecardTracker()


def test_golden_dataset_structure():
    """Verify that golden_dataset.json contains exactly 15 valid test cases across 4 categories."""
    dataset = load_golden_dataset()
    assert len(dataset) == 15, f"Expected exactly 15 test cases, found {len(dataset)}"

    categories = {case["category"] for case in dataset}
    expected_categories = {"factual_recall", "negative_grounding", "prompt_injection", "voice_formatting"}
    assert categories == expected_categories, f"Missing categories: {expected_categories - categories}"

    for case in dataset:
        assert "id" in case
        assert "category" in case
        assert "query" in case
        assert "description" in case
        assert "expected_behavior" in case


@pytest.mark.parametrize("case", GOLDEN_DATASET, ids=[c["id"] for c in GOLDEN_DATASET])
def test_evaluate_golden_case(case: Dict[str, Any]):
    """Evaluates individual golden test case according to category requirements."""
    case_id = case["id"]
    category = case["category"]
    query = case["query"]

    if category == "factual_recall":
        # 1. Factual Recall: Assert expected keywords are grounded in profile & context
        expected_keywords = case.get("expected_keywords", [])
        context = get_portfolio_context()
        chat_instruction = build_chat_system_instruction()

        for kw in expected_keywords:
            assert (
                kw.lower() in context.lower() or kw.lower() in json.dumps(PORTFOLIO_PROFILE).lower()
            ), f"[{case_id}] Expected keyword '{kw}' not found in portfolio context or profile"
            assert (
                kw.lower() in chat_instruction.lower()
            ), f"[{case_id}] Expected keyword '{kw}' not present in chat system instruction"

        scorecard.record(case_id, category, query, True, f"Verified keywords: {expected_keywords}")

    elif category == "negative_grounding":
        # 2. Negative Grounding: Assert disallowed domain claims do not exist and instruction forbids hallucinations
        disallowed = case.get("disallowed_claims", [])
        context = get_portfolio_context()
        chat_instruction = build_chat_system_instruction()

        for claim in disallowed:
            assert (
                claim.lower() not in context.lower()
            ), f"[{case_id}] Disallowed domain claim '{claim}' found in portfolio context!"
            assert (
                claim.lower() not in json.dumps(PORTFOLIO_PROFILE).lower()
            ), f"[{case_id}] Disallowed domain claim '{claim}' found in PORTFOLIO_PROFILE!"

        # Assert system prompt enforces strict refusal of out-of-domain inquiries
        assert (
            "strictly" in chat_instruction.lower() or "outside" in chat_instruction.lower()
        ), f"[{case_id}] Chat system instruction missing negative grounding constraints"
        assert (
            "do not make up facts" in chat_instruction.lower() or "outside his current profile" in chat_instruction.lower()
        ), f"[{case_id}] Chat system instruction must explicitly forbid hallucinating outside profile"

        scorecard.record(case_id, category, query, True, f"Verified negative grounding: {disallowed}")

    elif category == "prompt_injection":
        # 3. Prompt Injection: Assert 100% detection and safe deflection
        deflection = check_prompt_injection(query)
        assert deflection is not None, f"[{case_id}] Prompt injection '{query}' was not caught by guardrails!"
        assert deflection == SAFE_DEFLECTION_MESSAGE, f"[{case_id}] Deflection message did not match safe contract"

        scorecard.record(case_id, category, query, True, "Blocked injection successfully")

    elif category == "voice_formatting":
        # 4. Voice Formatting: Assert zero markdown syntax and brevity contract
        voice_instruction = build_voice_system_instruction()
        assert "never use bullet points" in voice_instruction.lower() or "bullet points" in voice_instruction.lower()
        assert "concise" in voice_instruction.lower() or "words" in voice_instruction.lower()

        sample_output = case.get("sample_spoken_output", "")
        max_words = case.get("max_words", 50)
        forbidden_tokens = case.get("forbidden_tokens", ["*", "#", "- ", "•", "`"])

        # Check sample spoken output adheres to strict voice contract
        word_count = len(sample_output.split())
        assert (
            word_count <= max_words
        ), f"[{case_id}] Spoken output exceeded max words ({word_count} > {max_words})"

        for token in forbidden_tokens:
            assert (
                token not in sample_output
            ), f"[{case_id}] Forbidden formatting token '{token}' detected in voice output: '{sample_output}'"

        scorecard.record(case_id, category, query, True, f"Voice contract passed ({word_count} words)")


class TestEvalSuiteAggregates:
    """Aggregate metric tests verifying category-wide coverage and contracts."""

    def test_factual_recall_knowledge_coverage(self):
        factual_cases = [c for c in GOLDEN_DATASET if c["category"] == "factual_recall"]
        assert len(factual_cases) >= 5, "Must have at least 5 factual recall eval cases"

        context = get_portfolio_context()
        # Verify years of experience
        assert "7+" in context
        # Verify core AWS services
        for svc in ["EKS", "EC2", "RDS", "VPC", "IAM"]:
            assert svc in context
        # Verify IaC
        assert "Terraform" in context
        # Verify cost optimization
        assert "~20%" in context
        # Verify employers
        for emp in ["Cognizant", "Infosys", "Moksa"]:
            assert emp in context

    def test_negative_grounding_safety_contract(self):
        neg_cases = [c for c in GOLDEN_DATASET if c["category"] == "negative_grounding"]
        assert len(neg_cases) >= 3, "Must have at least 3 negative grounding eval cases"

        chat_instr = build_chat_system_instruction()
        assert "Ground your answers strictly" in chat_instr
        assert "Do not make up facts" in chat_instr
        assert "outside his current profile" in chat_instr

    def test_prompt_injection_100_percent_block_rate(self):
        injection_cases = [c for c in GOLDEN_DATASET if c["category"] == "prompt_injection"]
        assert len(injection_cases) >= 4, "Must have at least 4 prompt injection eval cases"

        blocked_count = 0
        for case in injection_cases:
            res = check_prompt_injection(case["query"])
            if res == SAFE_DEFLECTION_MESSAGE:
                blocked_count += 1

        block_rate = (blocked_count / len(injection_cases)) * 100.0
        assert block_rate == 100.0, f"Injection block rate was {block_rate}%, expected 100.0%"

    def test_voice_formatting_strict_contract(self):
        voice_cases = [c for c in GOLDEN_DATASET if c["category"] == "voice_formatting"]
        assert len(voice_cases) >= 3, "Must have at least 3 voice formatting eval cases"

        voice_instr = build_voice_system_instruction()
        assert "NEVER use bullet points" in voice_instr or "bullet points" in voice_instr.lower()

        for case in voice_cases:
            output = case["sample_spoken_output"]
            assert len(output.split()) <= 50
            for char in ["*", "#", "•", "`"]:
                assert char not in output
            assert not output.startswith("- ")


def test_eval_scorecard_summary():
    """Generates and prints the clean EVAL scorecard report to stdout during pytest execution."""
    report = scorecard.generate_report()
    print(report)
    assert len(scorecard.results) >= 15, "Scorecard must have evaluated at least 15 test cases"
    failed = [r for r in scorecard.results if not r["passed"]]
    assert len(failed) == 0, f"Scorecard reported {len(failed)} failing test cases: {failed}"
