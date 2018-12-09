import * as React from 'react';
import {Quest} from 'shared/schema/Quests';
import {ContentSetsType, SettingsType} from '../../reducers/StateTypes';
import Card from '../base/Card';
import QuestButtonContainer from '../base/QuestButtonContainer';

export interface StateProps {
  quests: Quest[];
  settings: SettingsType;
  contentSets: Set<keyof ContentSetsType>;
}

export interface DispatchProps {
  onQuestSelect: (quest: Quest) => any;
  onReturn: () => void;
}

export interface Props extends StateProps, DispatchProps {}

const Tutorials = (props: Props): JSX.Element => {
  const items: JSX.Element[] = props.quests
    .filter((quest: Quest): boolean => {
      return (!quest.expansionhorror || props.contentSets.has('horror'))
          && (!quest.expansionfuture || props.contentSets.has('future'));
    })
    .map((quest: Quest, i: number): JSX.Element => {
      return (<QuestButtonContainer key={i} id={`quest${i}`} quest={quest} onClick={() => props.onQuestSelect(quest)}/>);
    });

  return (
    <Card title="Tutorial Quests" icon="helper" onReturn={props.onReturn}>
      {items}
    </Card>
  );
};

export default Tutorials;
