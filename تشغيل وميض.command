#!/bin/bash
project_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
if [ ! -x "$project_dir/.venv/bin/python" ]; then
  echo 'بيئة تشغيل المشروع غير موجودة.'
  read -r -p 'اضغط Enter للإغلاق.'
  exit 1
fi
"$project_dir/.venv/bin/python" "$project_dir/scripts/start_local.py"
result=$?
if [ "$result" -ne 0 ]; then read -r -p 'اضغط Enter للإغلاق.'; fi
exit "$result"
