import { Ad5xApiClient, resolveAd5xSocketTransport } from '../client'

function sharedSnapshot () {
  return {
    api_version: '1.0',
    backend_version: '0.1.6',
    revision: 7,
    backend: { health: 'ok' },
    modules: { ifs: {} }
  }
}

function zModule () {
  return {
    schema_version: '1.1',
    support: 'supported',
    enabled: true,
    presence: 'present',
    available: true,
    health: 'ok',
    capabilities: ['frontend_neutral_snapshot', 'read_only_reconciliation'],
    state: {
      calibration: {
        state: 'observer',
        motion_actions_enabled: false,
        motion_owner: 'zmod',
        offset_hook_enabled: true,
        offset_hook_status: 'loaded',
        offset_write_enabled: false,
        integration: {
          policy_status: 'loaded',
          policy_id: 'zcal-saved-check-v1-20260817',
          hook_commands: ['CC_APPLY_PROFILE', '_AD5X_Z_SAVED_CHECK_POLICY']
        }
      },
      offset: {
        auto_alignment: 0,
        persistent_user: -0.016,
        slicer_job: 0,
        live_adjustment: 0,
        external_unknown: 0,
        known_total: -0.016,
        effective: null,
        provenance_status: 'not_homed'
      },
      provenance: {
        status: 'not_homed',
        model: 'zmod-saved-check-observer-v1',
        sources: {
          effective: 'invalid_until_z_homed'
        },
        missing_components: [],
        actual_effective: null,
        reported_homing_origin_z: 0,
        requested_slicer_z_offset: null,
        slicer_z_offset_effect: 'ignored_by_zmod_global_offset_path',
        rc_path: {
          accepted_saved_check_flags: true
        }
      },
      job: {
        phase: 'standby',
        requested_slicer_z_offset: null,
        slicer_z_offset_effect: 'ignored_by_zmod_global_offset_path'
      },
      runtime: {
        klippy: 'ready',
        print_state: 'standby',
        homed_axes: '',
        effective_valid: false
      },
      safety: {
        fail_closed: true,
        h7_role: 'secondary',
        last_error: null
      }
    }
  }
}

function zSnapshot () {
  return {
    api_version: '1.0',
    module_version: '0.1.3',
    revision: 8,
    module: zModule()
  }
}

describe('Ad5xApiClient', () => {
  it('resolves the Fluidd runtime socket without relying on Vue type augmentation', () => {
    const emit = vi.fn()
    const socket = { emit }

    expect(resolveAd5xSocketTransport({ $socket: socket })).toBe(socket)
  })

  it('rejects an incompatible Fluidd socket host', () => {
    expect(() => resolveAd5xSocketTransport({ $socket: {} })).toThrow(
      'Fluidd socket transport is incompatible'
    )
  })

  it('keeps the shared Plugins AD5X snapshot boundary intact', async () => {
    const payload = sharedSnapshot()
    const emit = vi.fn().mockResolvedValue(payload)
    const client = new Ad5xApiClient({ emit })

    await expect(client.getSnapshot()).resolves.toEqual(payload)
    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.snapshot')
  })

  it('sends typed IFS actions through the Plugins AD5X RPC and accepts its snapshot', async () => {
    const payload = {
      ok: true,
      action: 'load_slot',
      slot: 2,
      result: 'ok',
      snapshot: sharedSnapshot()
    }
    const emit = vi.fn().mockResolvedValue(payload)
    const client = new Ad5xApiClient({ emit })

    await expect(client.performIfsAction('load_slot', 2)).resolves.toEqual(payload)
    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.ifs.action', {
      params: { action: 'load_slot', slot: 2 }
    })
  })

  it('accepts backend IFS rejections but rejects mismatched action responses', async () => {
    const rejected = {
      ok: false,
      action: 'unload_slot',
      slot: 3,
      error: 'toolhead_empty',
      snapshot: sharedSnapshot()
    }
    const client = new Ad5xApiClient({ emit: vi.fn().mockResolvedValue(rejected) })
    await expect(client.performIfsAction('unload_slot', 3)).resolves.toEqual(rejected)

    const mismatched = new Ad5xApiClient({ emit: vi.fn().mockResolvedValue({ ...rejected, slot: 4 }) })
    await expect(mismatched.performIfsAction('unload_slot', 3)).rejects.toThrow(
      'IFS action response is incompatible with API 1.0'
    )
  })

  it('rejects an invalid IFS slot before touching the socket', async () => {
    const emit = vi.fn()
    const client = new Ad5xApiClient({ emit })

    await expect(client.performIfsAction('select_slot', 5)).rejects.toThrow('Invalid IFS slot: 5')
    expect(emit).not.toHaveBeenCalled()
  })

  it('loads a fresh IFS job preview with the backend preview token', async () => {
    const preview = {
      available: true,
      source: 'zmod',
      filename: 'demo.gcode',
      requirements: [{ tool: 0, material: 'PLA', color: '#112233' }],
      assignments: [{ tool: 0, slot: 1 }],
      allowed_tool_count: 1,
      resolved_tool_map: [1],
      auto_assign: {},
      messages: [],
      error: ''
    }
    const payload = {
      ok: true,
      filename: 'demo.gcode',
      job_preview: preview,
      preview_token: 'a'.repeat(64),
      snapshot: sharedSnapshot()
    }
    const emit = vi.fn().mockResolvedValue(payload)
    const client = new Ad5xApiClient({ emit })

    await expect(client.previewIfsJob(' demo.gcode ')).resolves.toEqual(payload)
    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.ifs.job.preview', {
      params: { filename: 'demo.gcode' }
    })
  })

  it('submits the complete manual IFS mapping draft without starting a print', async () => {
    const preprintPlan = {
      available: true,
      source: 'zmod',
      filename: 'demo.gcode',
      status: 'ready',
      rows: [{
        tool: 0,
        requirement: { material: 'PLA', color: '#112233' },
        assignment: { slot: 2, present: true, metadata_status: 'assigned', spool: {}, appearance: {} },
        state: 'ready'
      }],
      warnings: [],
      summary: { required_tools: 1, assigned_tools: 1, ready_tools: 1 },
      auto_assign: {},
      messages: [],
      error: ''
    }
    const payload = {
      ok: true,
      mapping_draft: {
        status: 'ready',
        mapping_source: 'manual',
        filename: 'demo.gcode',
        preview_token: 'a'.repeat(64),
        draft_token: 'b'.repeat(64),
        allowed_tool_count: 1,
        resolved_tool_map: [2],
        provider_resolved_tool_map: [1],
        assignments: [{ tool: 0, slot: 2 }],
        modified: true,
        blockers: [],
        warnings: []
      },
      provider_auto_assign: {},
      preprint_plan: preprintPlan,
      launch_gate: {
        candidate: true,
        write_enabled: false,
        preview_token: 'a'.repeat(64),
        strict_policy: true,
        plan_status: 'ready',
        blockers: ['launch_write_not_enabled'],
        warnings: [],
        provider_launch_plan: {
          provider: 'zmod',
          command: 'PRINT_ZCOLOR',
          parameters: { FILENAME: 'demo.gcode', LEVELING: 1, ALLOWED_TOOL_COUNT: 1, T0: 2 },
          missing_parameters: [],
          blockers: [],
          ready: true,
          execution_enabled: false
        }
      },
      snapshot: sharedSnapshot()
    }
    const emit = vi.fn().mockResolvedValue(payload)
    const client = new Ad5xApiClient({ emit })

    await expect(client.draftIfsJobMapping('a'.repeat(64), [2])).resolves.toEqual(payload)
    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.ifs.job.mapping.draft', {
      params: { preview_token: 'a'.repeat(64), resolved_tool_map: [2] }
    })

    emit.mockClear()
    await expect(client.draftIfsJobMapping('a'.repeat(64), [2], 1)).resolves.toEqual(payload)
    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.ifs.job.mapping.draft', {
      params: { preview_token: 'a'.repeat(64), resolved_tool_map: [2], leveling: 1 }
    })
  })

  it('rejects invalid IFS preview tokens and mappings before touching the socket', async () => {
    const emit = vi.fn()
    const client = new Ad5xApiClient({ emit })

    await expect(client.previewIfsJob('   ')).rejects.toThrow('IFS preview filename is required')
    await expect(client.draftIfsJobMapping('bad-token', [1])).rejects.toThrow('Invalid IFS preview token')
    await expect(client.draftIfsJobMapping('a'.repeat(64), [0])).rejects.toThrow('Invalid IFS resolved tool map')
    await expect(client.draftIfsJobMapping('a'.repeat(64), [1], 2 as any)).rejects.toThrow('Invalid IFS leveling mode')
    expect(emit).not.toHaveBeenCalled()
  })

  it('updates and clears manual IFS metadata through the canonical backend endpoint', async () => {
    const spool = { source: 'flashforge', brand: 'Test', series: '', name: 'PETG', material: 'PETG', variant: '', spoolman_id: null, spoolman_spool_id: null, spoolman_filament_id: null, remaining_g: 500, remaining_length_mm: null, initial_g: 1000, used_g: 500, used_length_mm: null, location: '', archived: false, nozzle_temp: 240, bed_temp: 70, orca_material: '', orca_filament_id: 'keep', orca_setting_id: '' }
    const appearance = { color_mode: 'solid' as const, colors: ['#112233'], finish: 'matte' }
    const emit = vi.fn()
      .mockResolvedValueOnce({ ok: true, slot: 2, result: 'updated', snapshot: sharedSnapshot() })
      .mockResolvedValueOnce({ ok: true, slot: 2, result: 'cleared', snapshot: sharedSnapshot() })
    const client = new Ad5xApiClient({ emit })

    await client.updateIfsMetadata(2, spool, appearance)
    await client.clearIfsMetadata(2)

    expect(emit).toHaveBeenNthCalledWith(1, 'server.plugins_ad5x.ifs.metadata', {
      params: { slot: 2, clear: false, spool, appearance }
    })
    expect(emit).toHaveBeenNthCalledWith(2, 'server.plugins_ad5x.ifs.metadata', {
      params: { slot: 2, clear: true }
    })
  })

  it('loads the normalized Spoolman library through Plugins AD5X', async () => {
    const item = {
      spoolman_spool_id: 42,
      spoolman_filament_id: 7,
      spool: { source: 'spoolman', brand: 'Test', series: '', name: 'PETG', material: 'PETG', variant: '', spoolman_id: 42, spoolman_spool_id: 42, spoolman_filament_id: 7, remaining_g: 500, remaining_length_mm: null, initial_g: 1000, used_g: 500, used_length_mm: null, location: 'Shelf', archived: false, nozzle_temp: 240, bed_temp: 70, orca_material: '', orca_filament_id: '', orca_setting_id: '' },
      appearance: { color_mode: 'solid', colors: ['#112233'], finish: 'standard' },
      inventory: { remaining_g: 500, remaining_length_mm: null, initial_g: 1000, used_g: 500, used_length_mm: null, location: 'Shelf', archived: false }
    }
    const payload = { ok: true, query: 'petg', items: [item], count: 1 }
    const emit = vi.fn().mockResolvedValue(payload)
    await expect(new Ad5xApiClient({ emit }).getSpoolmanLibrary(' petg ')).resolves.toEqual(payload)
    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.ifs.spoolman.library', { params: { q: 'petg', limit: 20, allow_archived: false } })
  })

  it('uses concrete Spoolman spool ids for bind, unbind and refresh', async () => {
    const emit = vi.fn()
      .mockResolvedValueOnce({ ok: true, slot: 2, spool_id: 42, snapshot: sharedSnapshot() })
      .mockResolvedValueOnce({ ok: true, slot: 2, result: 'unbound', snapshot: sharedSnapshot() })
      .mockResolvedValueOnce({ ok: true, slot: 2, updated: 1, errors: [], snapshot: sharedSnapshot() })
    const client = new Ad5xApiClient({ emit })
    await client.bindSpoolman(2, 42)
    await client.unbindSpoolman(2)
    await client.refreshSpoolman(2)
    expect(emit).toHaveBeenNthCalledWith(1, 'server.plugins_ad5x.ifs.spoolman.bind', { params: { slot: 2, spool_id: 42, allow_archived: false } })
    expect(emit).toHaveBeenNthCalledWith(2, 'server.plugins_ad5x.ifs.spoolman.unbind', { params: { slot: 2, keep_metadata: true } })
    expect(emit).toHaveBeenNthCalledWith(3, 'server.plugins_ad5x.ifs.spoolman.refresh', { params: { slot: 2 } })
  })

  it('uses the standalone Z Calibration snapshot RPC', async () => {
    const payload = zSnapshot()
    const emit = vi.fn().mockResolvedValue(payload)
    const client = new Ad5xApiClient({ emit })

    await expect(client.getZCalibrationSnapshot()).resolves.toEqual(payload)
    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.z_calibration.snapshot')
  })

  it('uses read-only backend reconcile and validates its response', async () => {
    const payload = {
      revision: 9,
      module: zModule()
    }
    const emit = vi.fn().mockResolvedValue(payload)
    const client = new Ad5xApiClient({ emit })

    await expect(client.reconcileZCalibration()).resolves.toEqual(payload)
    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.z_calibration.reconcile')
  })

  it('loads bounded standalone diagnostics on demand', async () => {
    const payload = {
      schema_version: '1.1',
      events: [{
        schema_version: '1.1',
        sequence: 1,
        timestamp: 12.5,
        correlation_id: 'zcal-1',
        event_type: 'reconcile',
        payload: { health: 'ok' }
      }]
    }
    const emit = vi.fn().mockResolvedValue(payload)
    const client = new Ad5xApiClient({ emit })

    await expect(client.getZCalibrationDiagnostics()).resolves.toEqual(payload)
    expect(emit).toHaveBeenCalledWith('server.plugins_ad5x.z_calibration.diagnostics')
  })

  it('accepts the additive 0.1.3 unhomed validity fields', async () => {
    const payload = zSnapshot()
    const client = new Ad5xApiClient({
      emit: vi.fn().mockResolvedValue(payload)
    })

    await expect(client.getZCalibrationSnapshot()).resolves.toEqual(payload)
  })

  it('keeps schema 1.1 compatible when additive validity fields are absent', async () => {
    const payload = zSnapshot()
    delete (payload.module.state.runtime as { effective_valid?: boolean }).effective_valid
    delete (payload.module.state.provenance as { reported_homing_origin_z?: number | null }).reported_homing_origin_z
    const client = new Ad5xApiClient({
      emit: vi.fn().mockResolvedValue(payload)
    })

    await expect(client.getZCalibrationSnapshot()).resolves.toEqual(payload)
  })

  it('rejects a standalone snapshot from a different API contract', async () => {
    const payload = {
      ...zSnapshot(),
      api_version: '2.0'
    }
    const client = new Ad5xApiClient({
      emit: vi.fn().mockResolvedValue(payload)
    })

    await expect(client.getZCalibrationSnapshot()).rejects.toThrow(
      'Z Calibration snapshot response is incompatible with API 1.0'
    )
  })

  it('rejects the obsolete pre-coexistence shared Z module shape', async () => {
    const payload = {
      ...zSnapshot(),
      module: {
        ...zModule(),
        state: {
          ...zModule().state,
          calibration: {
            state: 'observer',
            motion_actions_enabled: false,
            offset_hook_enabled: true,
            offset_hook_status: 'loaded',
            offset_write_enabled: false
          }
        }
      }
    }
    const client = new Ad5xApiClient({
      emit: vi.fn().mockResolvedValue(payload)
    })

    await expect(client.getZCalibrationSnapshot()).rejects.toThrow(
      'Z Calibration snapshot response is incompatible with API 1.0'
    )
  })
})
