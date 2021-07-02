import React, { useMemo } from "react";
import styled from "styled-components";
import Icon, { IconSize } from "components/ads/Icon";
import Dropdown from "components/ads/Dropdown";
import { DependencyMap } from "utils/DynamicBindingUtils";
import { AppState } from "reducers";
import { useSelector } from "react-redux";
import { getDataTree } from "selectors/dataTreeSelectors";
import { isAction, isWidget } from "workers/evaluationUtils";
import { getPluginIcon, getWidgetIcon } from "../Explorer/ExplorerIcons";
import { getAction, getDatasource } from "selectors/entitiesSelector";
import { keyBy } from "lodash";
import { isStoredDatasource } from "entities/Action";
import Text, { TextType } from "components/ads/Text";
import { Classes } from "components/ads/common";
import { useEntityLink } from "components/editorComponents/Debugger/hooks";

const TopLayer = styled.div`
  display: flex;
  flex: 1;
  justify-content: space-between;
  border-bottom: 0.5px solid #e0dede;
  width: ${(props) => props.theme.propertyPane.width - props.theme.spaces[5]}px;

  .layout-control {
    border: none;
    box-shadow: none;
    background-color: ${(props) => props.theme.colors.propertyPane.bg};
  }
`;

const SelectedNodeWrapper = styled.div<{ iconAlignment: "LEFT" | "RIGHT" }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #090707;
  font-size: 12px;
  width: 114px;

  ${(props) =>
    props.iconAlignment === "LEFT"
      ? `border-right: 0.5px solid #e0dede;`
      : `border-left: 0.5px solid #e0dede;`}

  & > *:nth-child(2) {
    padding: 0 4px;
  }

  .${Classes.ICON} {
    margin-top: 1px;
  }
`;

export function getDependenciesFromInverseDependencies(
  deps: DependencyMap,
  entityName: string | null,
) {
  if (!entityName) return null;

  const directDependencies = new Set<string>();
  const inverseDependencies = new Set<string>();

  Object.entries(deps).forEach(([dependant, dependencies]) => {
    (dependencies as any).map((dependency: any) => {
      if (!dependant.includes(entityName) && dependency.includes(entityName)) {
        const entity = dependant
          .split(".")
          .slice(0, 1)
          .join("");

        directDependencies.add(entity);
      } else if (
        dependant.includes(entityName) &&
        !dependency.includes(entityName)
      ) {
        const entity = dependency
          .split(".")
          .slice(0, 1)
          .join("");

        inverseDependencies.add(entity);
      }
    });
  });

  return {
    inverseDependencies: Array.from(inverseDependencies),
    directDependencies: Array.from(directDependencies),
  };
}

const useGetEntityInfo = (name: string) => {
  const dataTree = useSelector(getDataTree);

  const entity = dataTree[name];
  const action = useSelector((state: AppState) =>
    isAction(entity) ? getAction(state, entity.actionId) : undefined,
  );

  const plugins = useSelector((state: AppState) => {
    return state.entities.plugins.list;
  });
  const pluginGroups = useMemo(() => keyBy(plugins, "id"), [plugins]);
  const icon = action && getPluginIcon(pluginGroups[action.pluginId]);
  const datasource = useSelector((state: AppState) =>
    action && isStoredDatasource(action.datasource)
      ? getDatasource(state, action.datasource.id)
      : undefined,
  );

  if (isWidget(entity)) {
    const icon = getWidgetIcon(entity.type);

    return {
      name,
      icon,
    };
  } else if (isAction(entity)) {
    return {
      name,
      icon,
      datasourceName: datasource?.name ?? "",
    };
  }
};

const useDependencyList = (name: string) => {
  const deps = useSelector((state: AppState) => state.evaluations.dependencies);
  const entityDependencies = getDependenciesFromInverseDependencies(
    deps.inverseDependencyMap,
    name,
  );
  const dependencyOptions =
    entityDependencies?.directDependencies.map((e) => ({
      label: e,
      value: e,
    })) ?? [];
  const inverseDependencyOptions =
    entityDependencies?.inverseDependencies.map((e) => ({
      label: e,
      value: e,
    })) ?? [];

  return {
    dependencyOptions,
    inverseDependencyOptions,
  };
};

const OptionWrapper = styled.div`
  align-items: center;
  display: flex;
  line-height: 8px;

  span:first-child {
    font-size: 10px;
    font-weight: normal;
  }

  .${Classes.TEXT} {
    margin-left: 6px;
    letter-spacing: 0px;
    overflow: hidden;
    white-space: initial;
    text-overflow: ellipsis;
  }
`;

function DummyOption(props: any) {
  const entityInfo = useGetEntityInfo(props.option.value);

  return (
    <OptionWrapper>
      <span>{entityInfo?.icon}</span>
      <Text type={TextType.H6}>
        {props.option.label}{" "}
        {entityInfo?.datasourceName && (
          <span>from {entityInfo?.datasourceName}</span>
        )}
      </Text>
    </OptionWrapper>
  );
}

function TriggerNode(props: any) {
  return (
    <SelectedNodeWrapper iconAlignment={props.iconAlignment}>
      {props.iconAlignment === "LEFT" && (
        <Icon keepColors name="trending-flat" size={IconSize.MEDIUM} />
      )}
      <span>
        {props.entityCount ? `${props.entityCount} entities` : "No Entity"}
      </span>
      {props.iconAlignment === "RIGHT" && (
        <Icon keepColors name="trending-flat" size={IconSize.MEDIUM} />
      )}
      <Icon keepColors name="expand-more" size={IconSize.XS} />
    </SelectedNodeWrapper>
  );
}

function PropertyPaneConnections(props: any) {
  const dependencies = useDependencyList(props.widgetName);
  const { navigateToEntity } = useEntityLink();

  return (
    <TopLayer>
      <Dropdown
        OptionValueNode={(OptionValueNodeProps) => (
          <DummyOption {...OptionValueNodeProps} />
        )}
        SelectedValueNode={(selectedValueProps) => (
          <TriggerNode
            iconAlignment={"LEFT"}
            {...selectedValueProps}
            entityCount={dependencies.dependencyOptions.length}
          />
        )}
        className="layout-control"
        disabled={!dependencies.dependencyOptions.length}
        headerLabel="Incoming connections"
        height="28px"
        onSelect={navigateToEntity}
        options={dependencies.dependencyOptions}
        selected={{ label: "", value: "" }}
        showDropIcon={false}
        showLabelOnly
        width="114px"
      />
      {/* <PopperDragHandle /> */}
      <Dropdown
        OptionValueNode={(OptionValueNodeProps) => (
          <DummyOption {...OptionValueNodeProps} />
        )}
        SelectedValueNode={(selectedValueProps) => (
          <TriggerNode
            iconAlignment={"RIGHT"}
            {...selectedValueProps}
            entityCount={dependencies.inverseDependencyOptions.length}
          />
        )}
        className="layout-control"
        disabled={!dependencies.inverseDependencyOptions.length}
        headerLabel="Outgoing connections"
        height="28px"
        onSelect={navigateToEntity}
        options={dependencies.inverseDependencyOptions}
        selected={{ label: "", value: "" }}
        showDropIcon={false}
        showLabelOnly
        width="114px"
      />
    </TopLayer>
  );
}

export default PropertyPaneConnections;