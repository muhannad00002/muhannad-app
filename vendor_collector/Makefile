.PHONY: help install run test lint export-excel export-csv clean

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

install:  ## Install Python dependencies
	pip install -r requirements.txt

run:  ## Launch the interactive CLI
	python app.py

test:  ## Run the unit test suite
	pytest -q

lint:  ## Static checks (flake8 if available)
	flake8 . || true

clean:  ## Remove caches and build artifacts
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache
