import React, { HTMLAttributes, useState, ChangeEventHandler, useEffect, useCallback, useMemo, useRef } from 'react';
import classnames from 'classnames';
import { LaneId } from '@teambit/lane-id';
import { Dropdown } from '@teambit/design.inputs.dropdown';
import { LaneModel } from '@teambit/lanes.ui.models.lanes-model';
import { InputText as SearchInput } from '@teambit/design.inputs.input-text';
import { ToggleButton } from '@teambit/design.inputs.toggle-button';
import { Icon } from '@teambit/design.elements.icon';
import { CheckboxItem } from '@teambit/design.inputs.selectors.checkbox-item';

import { LaneSelectorList } from './lane-selector-list';
import { LanePlaceholder } from './lane-placeholder';

import styles from './lane-selector.module.scss';

export type LaneSelectorProps = {
  nonMainLanes: Array<LaneModel>;
  mainLane?: LaneModel;
  selectedLaneId?: LaneId;
  groupByScope?: boolean;
  getHref?: (laneId: LaneId) => string;
  onLaneSelected?: (laneId: LaneId) => void;
  mainIcon?: React.ReactNode;
  scopeIcon?: (scopeName: string) => React.ReactNode;
  sortBy?: LaneSelectorSortBy;
  sortOptions?: LaneSelectorSortBy[];
  scopeIconLookup?: Map<string, React.ReactNode>;
} & HTMLAttributes<HTMLDivElement>;

export type GroupedLaneDropdownItem = [scope: string, lanes: LaneModel[]];

export type LaneDropdownItems = Array<LaneModel> | Array<GroupedLaneDropdownItem>;

export enum LaneSelectorSortBy {
  UPDATED = 'UPDATED',
  CREATED = 'CREATED',
  ALPHABETICAL = 'ALPHABETICAL',
}

export function LaneSelector(props: LaneSelectorProps) {
  const {
    className,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mainLane,
    nonMainLanes,
    selectedLaneId,
    groupByScope = true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getHref,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onLaneSelected,
    sortBy: sortByFromProps = LaneSelectorSortBy.ALPHABETICAL,
    sortOptions = [LaneSelectorSortBy.ALPHABETICAL, LaneSelectorSortBy.CREATED],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mainIcon,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    scopeIcon,
    scopeIconLookup,
    ...rest
  } = props;

  const compareFn = useCallback((_sortBy: LaneSelectorSortBy) => {
    switch (_sortBy) {
      case LaneSelectorSortBy.UPDATED:
        return (a: LaneModel, b: LaneModel) => {
          return (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0);
        };
      case LaneSelectorSortBy.CREATED:
        return (a: LaneModel, b: LaneModel) => {
          return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
        };
      default:
        return (a: LaneModel, b: LaneModel) => {
          const scopeCompareResult = a.id.scope.localeCompare(b.id.scope);
          if (groupByScope && scopeCompareResult !== 0) return scopeCompareResult;
          return a.id.name.toLowerCase().localeCompare(b.id.name.toLowerCase());
        };
    }
  }, []);

  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<LaneSelectorSortBy>(sortByFromProps);
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedNonMainLanes = useMemo(() => {
    return nonMainLanes.sort(compareFn(sortBy));
  }, [sortBy, nonMainLanes.length]);

  const [filteredLanes, setFilteredLanes] = useState<LaneModel[]>(sortedNonMainLanes);

  const [, setTrackedDropdownOpenState] = useState<boolean>(false);
  const onDropdownPlaceholderToggled = () => {
    setTrackedDropdownOpenState((v) => {
      if (!v) {
        inputRef.current?.focus();
      }
      return !v;
    });
  };

  const [groupScope, setGroupScope] = useState<boolean>(groupByScope);

  useEffect(() => {
    if (filteredLanes.length !== nonMainLanes.length) {
      setFilteredLanes(nonMainLanes);
    }
  }, [nonMainLanes.length]);

  const multipleLanes = nonMainLanes.length > 1;

  const handleSearchOnChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    e.stopPropagation();
    const searchTerm = e.target.value;
    if (!searchTerm || searchTerm === '') {
      setFilteredLanes(sortedNonMainLanes);
    } else {
      setFilteredLanes(() => {
        // first search for items that startWith search term
        let updatedLanes = sortedNonMainLanes.filter((lane) => {
          const laneName = lane.id.name;
          return laneName.toLowerCase().startsWith(searchTerm.toLowerCase());
        });
        // if nothing matches search anywhere in the string
        if (updatedLanes.length === 0) {
          updatedLanes = nonMainLanes.filter((lane) => {
            const laneName = lane.id.name;
            return laneName.toLowerCase().includes(searchTerm.toLowerCase());
          });
        }
        return [...updatedLanes];
      });
    }
    setSearch(searchTerm || '');
  };

  const handleSearchOnClick = (e) => {
    // prevent dropdown from closing
    e.stopPropagation();
  };

  function LaneSearch() {
    return (
      (multipleLanes && (
        <div className={styles.search}>
          <SearchInput
            ref={inputRef}
            className={styles.searchInput}
            value={search}
            onChange={handleSearchOnChange}
            onClick={handleSearchOnClick}
            autoFocus={true}
            icon={<Icon of="magnifying" className={styles.searchIcon} />}
          />
        </div>
      )) ||
      null
    );
  }

  function LaneGroup() {
    return (
      (multipleLanes && groupByScope && (
        <div className={styles.group}>
          <CheckboxItem
            checked={groupByScope}
            onInputChanged={(e) => {
              // prevent dropdown from closing
              setGroupScope((v) => !v);
              e.stopPropagation();
            }}
          >
            Group scopes
          </CheckboxItem>
        </div>
      )) ||
      null
    );
  }

  return (
    <div {...rest} className={classnames(className, styles.laneSelector)}>
      <Dropdown
        dropClass={styles.menu}
        position="bottom"
        clickPlaceholderToggles={true}
        onPlaceholderToggle={onDropdownPlaceholderToggled}
        placeholderContent={
          <LanePlaceholder disabled={!multipleLanes} selectedLaneId={selectedLaneId} showScope={groupByScope} />
        }
        className={classnames(styles.dropdown, !multipleLanes && styles.disabled)}
      >
        <LaneSearch />
        {multipleLanes && (
          <div className={styles.sortAndGroupBy}>
            <div className={styles.groupBy}>
              <LaneGroup />
            </div>
            <div className={styles.sort}>
              <ToggleButton
                className={classnames(styles.sortToggle)}
                defaultIndex={sortOptions.indexOf(sortBy)}
                options={sortOptions.map((option) => {
                  return {
                    value: option,
                    icon:
                      option === LaneSelectorSortBy.ALPHABETICAL ? (
                        <img className={styles.sortIcon} src="https://static.bit.cloud/bit-icons/ripple-list.svg" />
                      ) : (
                        <img className={styles.sortIcon} src="https://static.bit.cloud/bit-icons/clock.svg" />
                      ),
                    element: option === LaneSelectorSortBy.ALPHABETICAL ? 'a-Z' : option.toLowerCase(),
                  };
                })}
                onOptionSelect={(index, e) => {
                  e?.stopPropagation();
                  setSortBy(sortOptions[index]);
                  setFilteredLanes((_state) => {
                    const sortedState = _state.sort(compareFn(sortOptions[index]));
                    return [...sortedState];
                  });
                }}
              />
            </div>
          </div>
        )}
        <LaneSelectorList
          {...props}
          nonMainLanes={filteredLanes}
          search={search}
          sortBy={sortBy}
          groupByScope={groupScope}
          scopeIconLookup={scopeIconLookup}
        />
      </Dropdown>
    </div>
  );
}
