import * as core from '@actions/core';
import scheduleHandler from '../src/lib/schedule-handler';

describe('Schedule Handler', () => {
  it('should search issues with assigned_label', async () => {
    await scheduleHandler(core);
  });
  // Find all open issues with the assigned_label
  // Ensure that the issue is assigned to someone
  // Unassign the user
});
