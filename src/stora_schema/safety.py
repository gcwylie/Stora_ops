from __future__ import annotations

from stora_schema.models import History, Plan, SafetyError


def ensure_existing_untouched(plan: Plan) -> None:
    if any(item.published and not item.locked for item in plan.assignments):
        raise SafetyError("Refusing to write: new shifts must stay unpublished. Publishing is manual only.")


def write_drafts(history: History, plan: Plan) -> None:
    """Only new unpublished drafts would be created. Existing shifts are skipped.

    Upload is not connected yet.
    """
    ensure_existing_untouched(plan)
    new_items = [item for item in plan.assignments if not item.locked]
    if not new_items:
        raise SafetyError("Nothing new to write. Existing shifts were left unchanged.")
    raise SafetyError(
        "Draft upload is not enabled yet. Review the local plan first; "
        "nothing was written to Personalkollen."
    )
