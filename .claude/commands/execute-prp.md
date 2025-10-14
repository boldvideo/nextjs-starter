# Execute Elixir/Phoenix PRP

Implement a feature using the PRP file for an Elixir/Phoenix application.

## PRP File: $ARGUMENTS

## Execution Process

1. **Load PRP & Context Gathering**

   - Read the specified PRP file thoroughly
   - Understand all context and requirements
   - Follow all instructions in the PRP and extend research if needed
   - Ensure you have all needed context to implement the PRP fully
   - Do more web searches and codebase exploration as needed
   - Verify all dependencies are available in mix.exs
   - Check for any database migration requirements

2. **ULTRATHINK & Planning**

   - Think deeply before executing the plan
   - Create a comprehensive plan addressing all requirements
   - Break down complex tasks into smaller, manageable steps using your todos tools
   - Use the TodoWrite tool to create and track your implementation plan
   - Identify implementation patterns from existing code to follow
   - Consider the supervision tree and process architecture
   - Plan the order of implementation:
     1. Dependencies (mix.exs updates)
     2. Database migrations
     3. Schemas and changesets
     4. Context modules
     5. Core business logic
     6. Web layer (controllers/LiveViews)
     7. Tests
     8. Documentation

3. **Pre-Implementation Setup**

   - Add any new dependencies to mix.exs
   - Run `mix deps.get` to fetch dependencies
   - Create any necessary database migrations
   - Run `mix ecto.create` and `mix ecto.migrate` if needed
   - Set up any required configuration in config files

4. **Execute the Plan**

   - Implement code following the PRP guidelines
   - Follow Elixir idioms and patterns specified
   - Use pattern matching and pipeline operators appropriately
   - Implement proper error handling with {:ok, _} | {:error, _} tuples
   - Add typespecs to all public functions
   - Follow the coding style inspiration (Valim/Jurić/Thomas patterns)
   - Commit frequently with meaningful messages

5. **Incremental Validation**
   After each module/feature:

   ```bash
   # Format code
   mix format

   # Check compilation
   mix compile --warnings-as-errors

   # Run specific tests
   mix test test/path/to/specific_test.exs
   ```

6. **Full Validation Suite**
   Run each validation command from the PRP:

   ```bash
   # Format check
   mix format --check-formatted

   # Static analysis
   mix credo --strict
   mix dialyzer

   # Full test suite
   mix test --cover --warnings-as-errors

   # Documentation
   mix docs

   # Security
   mix sobelow --config

   # Dependencies
   mix deps.audit
   ```

   Fix any failures and re-run until all pass

7. **Post-Implementation Checks**

   - Verify all database migrations work (migrate and rollback)
   - Check test coverage meets requirements
   - Ensure documentation is complete
   - Verify all PRP checklist items are done
   - Test in development environment
   - Check for any performance issues

8. **Complete & Review**

   - Re-read the PRP to ensure everything is implemented
   - Run final validation suite
   - Create a summary of:
     - What was implemented
     - Any deviations from the PRP and why
     - Any discovered edge cases
     - Performance considerations noted
     - Suggestions for future improvements
   - Report completion status with confidence score

9. **Reference & Iterate**
   - Keep the PRP accessible for reference
   - If validation fails, use error patterns in PRP to fix
   - Document any learnings for future PRPs
   - Update PRP if significant discoveries were made

## Common Elixir/Phoenix Gotchas to Check

- [ ] Ecto associations properly preloaded (avoid N+1)
- [ ] GenServer state not growing unbounded
- [ ] Proper supervision tree integration
- [ ] Database transactions used appropriately
- [ ] LiveView assigns minimized
- [ ] Async tests truly isolated
- [ ] No compiler warnings
- [ ] Process crashes handled gracefully

## Emergency Procedures

If stuck:

1. Check similar patterns in codebase
2. Consult HexDocs for the specific library
3. Search ElixirForum for similar issues
4. Review the PRP for missed context
5. Consider simpler implementation first, then optimize

Note: Always prioritize working code with tests over perfect code without tests.
