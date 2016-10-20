import {
  NEW_QUEST, LOAD_QUEST, SAVE_QUEST, DELETE_QUEST, DOWNLOAD_QUEST,
  RequestQuestLoadAction, ReceiveQuestLoadAction,
  RequestQuestSaveAction, ReceiveQuestSaveAction,
  RequestQuestDeleteAction, ReceiveQuestDeleteAction,
  RequestQuestShareAction, ReceiveQuestShareAction,
  RequestQuestPublishAction, ReceiveQuestPublishAction,
} from './ActionTypes'
import {QuestType, ShareType} from '../reducers/StateTypes'

import {setDialog} from './dialogs'
import {pushError, pushHTTPError} from '../error'
import {getBuffer} from '../buffer'

// Loaded on index.html
type realtimeUtils = any;

var toXML: any = (require('../../translation/to_xml') as any).toXML;

function receiveQuestLoad(quest: QuestType ): ReceiveQuestLoadAction {
  return {type: 'RECEIVE_QUEST_LOAD', quest};
}

function loadQuest(dispatch: Redux.Dispatch<any>, id: string): JQueryPromise<any> {
  // We only load quests when the drawer is open.
  dispatch({type: 'REQUEST_QUEST_LOAD', id});
  return $.get("/quest/"+id, function(raw_result: string) {
    var result: QuestType = JSON.parse(raw_result);
    $.get(result.draftUrl, function(data: string) {
      result.md = data;
      dispatch(receiveQuestLoad(result));
    }).fail(pushHTTPError);
  }).fail(pushHTTPError);
}

function publishQuest(dispatch: Redux.Dispatch<any>, id: string): JQueryPromise<any> {
  // Pull from the text buffer for maximum freshness.
  var data = getBuffer();

  try {
    data = toXML(data, false);
    console.log(data);
  } catch (e) {
    pushError(e);
    dispatch(setDialog('ERROR', true));
    return;
  }

  dispatch({type: 'REQUEST_QUEST_PUBLISH', id} as RequestQuestPublishAction);
  return $.post("/publish/" + id, data, function(result_quest_id: string) {
    dispatch({type: 'RECEIVE_QUEST_PUBLISH', id: result_quest_id} as ReceiveQuestPublishAction);
  }).fail(pushHTTPError);
}

export function saveQuest(dispatch: Redux.Dispatch<any>, id: string, cb: ((id:string)=>void)): JQueryPromise<any> {
  // Pull from the text buffer for maximum freshness.
  var data = getBuffer();

  dispatch({type: 'REQUEST_QUEST_SAVE', id} as RequestQuestSaveAction);
  return $.post("/quest/" + id, data, function(result_quest_id: string) {
    dispatch({type: 'RECEIVE_QUEST_SAVE', id: result_quest_id} as ReceiveQuestSaveAction);
    if (cb) {
      cb(result_quest_id);
    }
  }).fail(pushHTTPError);
}

export function setQuestShare(id: string, share: ShareType): ((dispatch: Redux.Dispatch<any>)=>any) {
  return (dispatch: Redux.Dispatch<any>): any => {
    dispatch({type: 'REQUEST_QUEST_SHARE', id, share} as RequestQuestShareAction);
    return $.post("/share/" + id + "/" + share, function(result: ShareType) {
      dispatch({type: 'RECEIVE_QUEST_SHARE', id, share: result} as ReceiveQuestShareAction);
    }).fail(pushHTTPError);
  }
}

function deleteQuest(dispatch: Redux.Dispatch<any>, id: string): JQueryPromise<any> {
  dispatch({type: 'REQUEST_QUEST_DELETE', id} as RequestQuestDeleteAction);
  console.log(pushHTTPError);
  return $.post("/delete/" + id).done(function(result) {
    dispatch({type: 'RECEIVE_QUEST_DELETE', id, result} as ReceiveQuestDeleteAction);
  }).fail(function(err) {pushHTTPError(err)});
}

function downloadQuest(dispatch: Redux.Dispatch<any>, url: string): void {
  if (!url) {
    pushError(new Error("No quest data available to download. Please save your quest first."));
  } else {
    window.open(url, '_blank');
  }
}

export function questAction(action: string, force: boolean, dirty: boolean, quest: QuestType): ((dispatch: Redux.Dispatch<any>)=>any) {
  return (dispatch: Redux.Dispatch<any>): any => {
    // Show confirmation dialogs for certain actions if
    // we have a dirty editor.
    if (dirty && !force) {
      switch(action) {
        case 'NEW_QUEST':
          return dispatch(setDialog('CONFIRM_NEW_QUEST', true));
        case 'LOAD_QUEST':
          return dispatch(setDialog('CONFIRM_LOAD_QUEST', true));
        default:
          break;
      }
    }

    // Some quest actions (e.g. LOAD_QUEST) require HTTP requests
    // to recieve data. Intercept those here.
    switch(action) {
      case 'LOAD_QUEST':
        return loadQuest(dispatch, quest.id);
      case 'SAVE_QUEST':
        return saveQuest(dispatch, quest.id, ()=>{});
      case 'SHARE_SETTINGS':
        return dispatch(setDialog('SHARE_SETTINGS', true));
      case 'DELETE_QUEST':
        return deleteQuest(dispatch, quest.id);
      case 'DOWNLOAD_QUEST':
        return downloadQuest(dispatch, quest.draftUrl);
      case 'PUBLISH_QUEST':
        return publishQuest(dispatch, quest.id);
      default:
        break;
    }

    return dispatch({type: action});
  }
}