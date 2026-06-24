import { EndpointData, IEndpoint, IEndpointGroup } from '../models';
import {
  endpointRepository,
  endpointGroupRepository,
  endpointDataRepository,
  logRepository,
  groupRepository,
} from '../repositories';
import { SchemaField, HttpMethod } from '../types';
import { settingsService } from './settings.service';
import { normalizeNetworkAccessInput } from '../utils';

const EXPORT_VERSION = '1.2';

export interface ProjectExportOptions {
  includeData?: boolean;
  includeSettings?: boolean;
}

export interface ProjectImportOptions {
  mode?: 'merge' | 'replace';
  includeData?: boolean;
}

type ExportedGroup = {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  networkAccess?: IEndpointGroup['networkAccess'];
};

type ExportedEndpoint = {
  key: string;
  name: string;
  description?: string;
  slug: string;
  path: string;
  method: string;
  groupName?: string;
  fields: SchemaField[];
  accessType: string;
  allowedGroupNames: string[];
  networkAccess?: IEndpoint['networkAccess'];
  inheritGroupNetworkAccess?: boolean;
  handlers: IEndpoint['handlers'];
  enabled: boolean;
};

type ExportedData = {
  endpointKey: string;
  resourcePath: string;
  data: Record<string, unknown>;
};

export type ProjectBundle = {
  version: string;
  exportedAt: string;
  platform: 'dynamic-api-platform';
  endpointGroups: ExportedGroup[];
  endpoints: ExportedEndpoint[];
  endpointData?: ExportedData[];
  settings?: Record<string, unknown>;
};

function endpointKey(method: string, path: string): string {
  return `${method.toUpperCase()}:${path}`;
}

function serializeGroup(group: IEndpointGroup): ExportedGroup {
  return {
    name: group.name,
    description: group.description,
    icon: group.icon,
    color: group.color,
    order: group.order,
    networkAccess: group.networkAccess,
  };
}

function serializeEndpoint(endpoint: IEndpoint, userGroupNames: Map<string, string>): ExportedEndpoint {
  const groupName =
    typeof endpoint.groupId === 'object' && endpoint.groupId !== null && 'name' in endpoint.groupId
      ? String((endpoint.groupId as { name: string }).name)
      : undefined;

  const allowedGroupNames = (endpoint.allowedGroupIds || []).map((gid) => {
    const id = typeof gid === 'object' && gid !== null && '_id' in gid ? String((gid as { _id: unknown })._id) : String(gid);
    return userGroupNames.get(id) || id;
  });

  const fields = endpoint.fields.map((field) => {
    const copy = { ...field };
    if (field.type === 'reference' && field.refEndpointId) {
      return { ...copy, refEndpointKey: field.refEndpointId };
    }
    return copy;
  });

  return {
    key: endpointKey(endpoint.method, endpoint.path),
    name: endpoint.name,
    description: endpoint.description,
    slug: endpoint.slug,
    path: endpoint.path,
    method: endpoint.method,
    groupName,
    fields,
    accessType: endpoint.accessType,
    allowedGroupNames,
    networkAccess: endpoint.networkAccess,
    inheritGroupNetworkAccess: endpoint.inheritGroupNetworkAccess,
    handlers: endpoint.handlers,
    enabled: endpoint.enabled,
  };
}

export class ProjectService {
  async export(options: ProjectExportOptions = {}): Promise<ProjectBundle> {
    const { includeData = false, includeSettings = false } = options;

    const [groups, endpoints, allUserGroups] = await Promise.all([
      endpointGroupRepository.findAll(),
      endpointRepository.findAll({ isSystem: false }),
      groupRepository.findAll(),
    ]);

    const userGroupNames = new Map(allUserGroups.map((g) => [g._id.toString(), g.name]));
    const endpointIdToKey = new Map(
      endpoints.map((ep) => [ep._id.toString(), endpointKey(ep.method, ep.path)])
    );

    const serializedEndpoints = endpoints.map((ep) => {
      const serialized = serializeEndpoint(ep, userGroupNames);
      serialized.fields = ep.fields.map((field) => {
        if (field.type === 'reference' && field.refEndpointId) {
          const refKey = endpointIdToKey.get(field.refEndpointId) || field.refEndpointId;
          return { ...field, refEndpointId: refKey };
        }
        return field;
      });
      return serialized;
    });

    const bundle: ProjectBundle = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      platform: 'dynamic-api-platform',
      endpointGroups: groups.map(serializeGroup),
      endpoints: serializedEndpoints,
    };

    if (includeData) {
      const allData = await EndpointData.find();
      bundle.endpointData = allData.map((row) => ({
        endpointKey: endpointIdToKey.get(row.endpointId.toString()) || row.endpointId.toString(),
        resourcePath: row.resourcePath,
        data: row.data as Record<string, unknown>,
      }));
    }

    if (includeSettings) {
      bundle.settings = settingsService.getAll() as unknown as Record<string, unknown>;
    }

    return bundle;
  }

  async import(bundle: ProjectBundle, options: ProjectImportOptions = {}, userId?: string): Promise<{
    groupsCreated: number;
    endpointsCreated: number;
    endpointsUpdated: number;
    recordsImported: number;
  }> {
    if (bundle.platform !== 'dynamic-api-platform') {
      throw new Error('Invalid project bundle: unsupported platform');
    }

    const { mode = 'merge', includeData = true } = options;
    const stats = { groupsCreated: 0, endpointsCreated: 0, endpointsUpdated: 0, recordsImported: 0 };

    if (mode === 'replace') {
      const existing = await endpointRepository.findAll({ isSystem: false });
      for (const ep of existing) {
        await endpointRepository.delete(ep._id.toString());
      }
      const existingGroups = await endpointGroupRepository.findAll();
      for (const group of existingGroups) {
        await endpointGroupRepository.delete(group._id.toString());
      }
    }

    const groupNameToId = new Map<string, string>();
    for (const group of bundle.endpointGroups || []) {
      const existing = (await endpointGroupRepository.findAll()).find((g) => g.name === group.name);
      if (existing) {
        groupNameToId.set(group.name, existing._id.toString());
        if (group.networkAccess) {
          await endpointGroupRepository.update(existing._id.toString(), {
            ...group,
            networkAccess: normalizeNetworkAccessInput(group.networkAccess),
          });
        }
      } else {
        const created = await endpointGroupRepository.create({
          name: group.name,
          description: group.description,
          icon: group.icon,
          color: group.color,
          order: group.order,
          networkAccess: group.networkAccess ? normalizeNetworkAccessInput(group.networkAccess) : undefined,
        });
        groupNameToId.set(group.name, created._id.toString());
        stats.groupsCreated++;
      }
    }

    const allUserGroups = await groupRepository.findAll();
    const userGroupNameToId = new Map(allUserGroups.map((g) => [g.name, g._id.toString()]));

    const endpointKeyToId = new Map<string, string>();
    const existingEndpoints = await endpointRepository.findAll({ isSystem: false });

    for (const ep of bundle.endpoints || []) {
      const existing = existingEndpoints.find(
        (e) => e.path === ep.path && e.method.toUpperCase() === ep.method.toUpperCase()
      );

      const payload: Partial<IEndpoint> = {
        name: ep.name,
        description: ep.description,
        slug: ep.slug,
        path: ep.path,
        method: ep.method.toUpperCase() as HttpMethod,
        groupId: ep.groupName ? (groupNameToId.get(ep.groupName) as unknown as IEndpoint['groupId']) : undefined,
        fields: ep.fields.map((f) => ({ ...f, refEndpointId: undefined })),
        accessType: ep.accessType as IEndpoint['accessType'],
        allowedGroupIds: ep.allowedGroupNames
          .map((name) => userGroupNameToId.get(name))
          .filter(Boolean) as unknown as IEndpoint['allowedGroupIds'],
        networkAccess: ep.networkAccess ? normalizeNetworkAccessInput(ep.networkAccess) : undefined,
        inheritGroupNetworkAccess: ep.inheritGroupNetworkAccess ?? true,
        handlers: ep.handlers || [],
        enabled: ep.enabled ?? true,
        isSystem: false,
      };

      if (existing) {
        await endpointRepository.update(existing._id.toString(), payload);
        endpointKeyToId.set(ep.key, existing._id.toString());
        stats.endpointsUpdated++;
      } else {
        const created = await endpointRepository.create(payload);
        endpointKeyToId.set(ep.key, created._id.toString());
        stats.endpointsCreated++;
      }
    }

    for (const ep of bundle.endpoints || []) {
      const endpointId = endpointKeyToId.get(ep.key);
      if (!endpointId) continue;

      const fieldsWithRefs = ep.fields.map((field) => {
        if (field.type === 'reference' && field.refEndpointId) {
          const refId = endpointKeyToId.get(field.refEndpointId);
          return { ...field, refEndpointId: refId || field.refEndpointId };
        }
        return field;
      });

      await endpointRepository.update(endpointId, { fields: fieldsWithRefs });
    }

    if (includeData && bundle.endpointData?.length) {
      for (const row of bundle.endpointData) {
        const endpointId = endpointKeyToId.get(row.endpointKey);
        if (!endpointId) continue;
        await endpointDataRepository.create(endpointId, row.resourcePath, row.data);
        stats.recordsImported++;
      }
    }

    if (bundle.settings) {
      await settingsService.update(bundle.settings as Parameters<typeof settingsService.update>[0]);
    }

    await logRepository.create({
      action: 'endpoint_update',
      userId: userId as unknown as import('mongoose').Types.ObjectId,
      message: `Project imported (${stats.endpointsCreated} created, ${stats.endpointsUpdated} updated)`,
      details: stats,
    });

    return stats;
  }
}

export const projectService = new ProjectService();
