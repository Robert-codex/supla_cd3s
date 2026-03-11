from pathlib import Path
import importlib.util

Import("env")

project_dir = Path(env["PROJECT_DIR"])
profile_path = project_dir / "profiles" / "active_profile.json"
output_path = project_dir / "include" / "generated_profile_data.h"
codegen_path = project_dir / "tools" / "profile_codegen.py"

spec = importlib.util.spec_from_file_location("profile_codegen", codegen_path)
profile_codegen = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(profile_codegen)

if profile_path.exists():
    profile_codegen.generate_to_path(profile_path, output_path)
    print(f"[gui-generic] generated {output_path.name} from {profile_path}")
elif output_path.exists():
    output_path.unlink()
    print("[gui-generic] removed stale generated profile header")
else:
    print("[gui-generic] profiles/active_profile.json not found, using manual fallback")
