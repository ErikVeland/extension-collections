import { initFromProfile } from '../../collectionCreate';
import {
  MAX_COLLECTION_NAME_LENGTH,
  MIN_COLLECTION_NAME_LENGTH,
  MOD_TYPE, NAMESPACE, NEXUS_NEXT_URL } from '../../constants';
import { makeCollectionId, validateName } from '../../util/transformCollection';

import CollectionThumbnail from './CollectionThumbnail';

import i18next from 'i18next';
import * as React from 'react';
import { Panel, Tab, Tabs } from 'react-bootstrap';
import { Trans } from 'react-i18next';
import { ComponentEx, EmptyPlaceholder, Icon, IconBar, tooltip, types, util } from 'vortex-api';
import InfoCache from '../../util/InfoCache';

const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSc3csy4ycVBECvHQDgri37Gqq1gOuTQ7LcpiIaOkGHpDsW4kA/viewform?usp=sf_link';
const BUG_REPORT_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdmDBdGjTQVRa7wRouN4yP6zMvqsxTT86R-DwmQXZq7SWGCSg/viewform?usp=sf_link';

export interface IStartPageProps {
  t: i18next.TFunction;
  game: types.IGameStored;
  installing: types.IMod;
  infoCache: InfoCache;
  profile: types.IProfile;
  activeTab: string;
  mods: { [modId: string]: types.IMod };
  matchedReferences: { [collectionId: string]: types.IMod[] };
  onCreateCollection: (name: string) => void;
  onEdit: (modId: string) => void;
  onUpdate: (modId: string) => void;
  onUpload: (modId: string) => void;
  onView: (modId: string) => void;
  onRemove: (modId: string) => void;
  onResume: (modId: string) => void;
  onPause: (modId: string) => void;
  onSetActiveTab: (tabId: string) => void;
}

interface IComponentState {
  createOpen: boolean;
  mousePosition: { x: number, y: number };
  imageTime: number;
}

const nop = () => null;

// allow any unicode character that is considered a letter or a number and the
// special characters space and minus
const validRE = /^[\p{L}\p{N} -]*$/u;

function validateCollectionName(t: i18next.TFunction, input: string): string {
  if ((input.length < MIN_COLLECTION_NAME_LENGTH) || (input.length > MAX_COLLECTION_NAME_LENGTH)) {
    return t('The name bust be between {{min}}-{{max}} characters long', {
      replace: {
        min: MIN_COLLECTION_NAME_LENGTH,
        max: MAX_COLLECTION_NAME_LENGTH,
      },
    });
  }

  if (input.match(validRE) === null) {
    return t('Invalid characters, only letters, numbers, space and - are allowed.');
  }

  return undefined;
}

interface IAddCardProps {
  t: types.TFunction;
  onClick: () => void;
}

function AddCard(props: IAddCardProps) {
  const { t, onClick } = props;

  const classes = ['collection-add-btn'];

  return (
    <Panel className={classes.join(' ')} bsStyle='default' onClick={onClick}>
      <Panel.Body className='collection-thumbnail-body'>
        <EmptyPlaceholder
          icon='folder-add'
          text={t('Discover more collections')}
        />
      </Panel.Body>
    </Panel>
  );
}

interface ICreateCardProps {
  t: types.TFunction;
  onCreateFromProfile: () => void;
  onCreateEmpty: () => void;
  onTrackClick: (namespace: string, eventName: string) => void;
}

function CreateCard(props: ICreateCardProps) {
  const { t, onTrackClick } = props;

  const classes = ['collection-add-btn'];

  const actions: types.IActionDefinition[] = [
    {
      title: 'From Profile',
      icon: 'profile',
      action: (instanceIds: string[]) => {
        onTrackClick('Collections', 'From profile');
        props.onCreateFromProfile();
      },
    }, {
      title: 'Empty',
      icon: 'show',
      action: (instanceIds: string[]) => {
        onTrackClick('Collections', 'Empty');
        props.onCreateEmpty();
      },
    },
  ];

  return (
    <Panel className={classes.join(' ')} bsStyle='default'>
      <Panel.Body className='collection-thumbnail-body'>
        <EmptyPlaceholder
          icon='add'
          text={t('Create a collection')}
          fill
        />
        <div className='hover-menu'>
          <div key='primary-buttons' className='hover-content'>
            <IconBar
              className='buttons'
              group='collection-actions'
              staticElements={actions}
              collapse={false}
              buttonType='text'
              orientation='vertical'
              clickAnywhere={true}
              t={t}
            />
          </div>
        </div>
      </Panel.Body>
    </Panel>
  );
}

class StartPage extends ComponentEx<IStartPageProps, IComponentState> {
  constructor(props: IStartPageProps) {
    super(props);
    this.initState({
      createOpen: false,
      imageTime: Date.now(),
      mousePosition: { x: 0, y: 0 },
    });
  }

  public render(): JSX.Element {
    const { t, activeTab, installing, profile, matchedReferences, mods, onEdit, onPause,
            onRemove, onResume, onUpdate, onUpload, onView } = this.props;
    const { imageTime } = this.state;

    const collections = Object.values(mods).filter(mod => mod.type === MOD_TYPE);
    const { foreign, own } = collections.reduce((prev, mod) => {
      if (util.getSafe(mod.attributes, ['editable'], false)) {
        prev.own.push(mod);
      } else {
        prev.foreign.push(mod);
      }
      return prev;
    }, { foreign: [], own: [] });

    const id = makeCollectionId(profile.id);

    return (
      <>
        <div className='feedback-bar'>
          <Icon name='details' />
          <span className='feedback-bar__text'>
            {/* #60a5fb */}
            {t('Collections are in an early testing stage, you may find some features are '
               + 'incomplete. Please share your feedback or report bugs you find.')}
          </span>
          <div className='feedback-bar__buttons'>
            <tooltip.IconButton
              icon='feedback'
              tooltip='Opens the feedback page in your default browser'
              onClick={this.openFeedback}
            >
              {t('Feedback')}
            </tooltip.IconButton>
            <tooltip.IconButton
              icon='bug'
              tooltip={t('Open bug report page in your default browser')}
              onClick={this.openBugReport}
            >
              {t('Bugs')}
            </tooltip.IconButton>
          </div>
        </div>
        <Tabs id='collection-start-page' activeKey={activeTab} onSelect={this.setActiveTab}>
          <Tab
            tabClassName='collection-tab'
            eventKey='active-collections'
            title={<><Icon name='add'/>{t('Added Collections')}</>}
          >
            <Panel>
              <Panel.Heading>
                <Panel.Title>
                  {t('View and manage collections created by other users.')}
                </Panel.Title>
              </Panel.Heading>
              <Panel.Body>
                <div className='collection-list'>
                  <AddCard t={t} onClick={this.openCollections} />
                  {foreign.map(mod =>
                    <CollectionThumbnail
                      key={mod.id}
                      t={t}
                      gameId={profile.gameId}
                      imageTime={imageTime}
                      installing={installing}
                      mods={mods}
                      incomplete={matchedReferences[mod.id]?.includes?.(null)}
                      collection={mod}
                      infoCache={this.props.infoCache}
                      onView={onView}
                      onRemove={onRemove}
                      onResume={onResume}
                      onPause={onPause}
                      onUpdate={onUpdate}
                      details={true}
                    />)}
                </div>
              </Panel.Body>
            </Panel>
          </Tab>
          <Tab
            tabClassName='collection-tab'
            eventKey='collection-workshop'
            title={<><Icon name='highlight-tool' />{t('Workshop')}</>}
          >
            <Panel>
              <Panel.Heading>
                <Panel.Title>
                  <Trans ns={NAMESPACE} i18nKey='collection-own-page'>
                    Build your own collections and share them with the Nexus Mods community.
                    You can view all your uploaded collections&nbsp;<a
                      onClick={this.openMyCollectionsPage}
                      className='my-collections-page-link'
                      title={t('Open My Collections Page')}
                    >
                      here.
                    </a>
                  </Trans>
                </Panel.Title>
              </Panel.Heading>
              <Panel.Body>
                <div className='collection-list'>
                  <CreateCard
                    t={t}
                    onCreateFromProfile={this.fromProfile}
                    onCreateEmpty={this.fromEmpty}
                    onTrackClick={this.trackEvent}
                  />
                  {own.map(mod =>
                    <CollectionThumbnail
                      key={mod.id}
                      t={t}
                      gameId={profile.gameId}
                      collection={mod}
                      infoCache={this.props.infoCache}
                      imageTime={imageTime}
                      mods={mods}
                      incomplete={matchedReferences[mod.id]?.includes?.(null)}
                      onEdit={onEdit}
                      onRemove={onRemove}
                      onUpload={onUpload}
                      details={true}
                    />)}
                </div>
              </Panel.Body>
            </Panel>
          </Tab>
        </Tabs>
      </>
    );
  }

  private setActiveTab = (tabId: any) => {
    this.props.onSetActiveTab(tabId);
    this.context.api.events.emit(
      'analytics-track-navigation', `collections/${tabId}`,
    );
  }

  private openCollections = () => {
    const { game } = this.props;
    this.context.api.events.emit('analytics-track-click-event', 'Collections', 'Discover more');
    util.opn(`${NEXUS_NEXT_URL}/${(util as any).nexusGameId(game)}/collections`).catch(() => null);
  }

  private openMyCollectionsPage = () => {
    this.context.api.events.emit('analytics-track-click-event',
                                 'Collections', 'Open My Collections');
    util.opn(`${NEXUS_NEXT_URL}/my-collections`).catch(() => null);
  }

  private trackEvent = (namespace: string, eventName: string) => {
    this.context.api.events.emit('analytics-track-click-event', namespace, eventName);
  }

  private openFeedback = () => {
    util.opn(FEEDBACK_URL).catch(() => null);
  }

  private openBugReport = () => {
    util.opn(BUG_REPORT_URL).catch(() => null);
  }

  private fromProfile = async () => {
    const { t, profile } = this.props;

    try {
      // initFromProfile will automatically query for the name
      await initFromProfile(this.context.api, profile.id);
      this.refreshImages();
    } catch (err) {
      if (!(err instanceof util.UserCanceled)) {
        this.context.api.showErrorNotification('Failed to init collection', err);
      }
    }
  }

  private fromEmpty = async () => {
    const { t, onCreateCollection } = this.props;

    try {
      const result = await this.context.api.showDialog('question', 'New empty Collection', {
        text: 'Create an empty collection which you can manually add mods to.',
        input: [{ id: 'name', label: 'Collection Name', type: 'text' }],
        condition: content => validateName(t, content),
      }, [
        { label: 'Cancel' },
        { label: 'Create', default: true },
      ]);

      if (result.action === 'Create') {
        await onCreateCollection(result.input['name']);
        this.refreshImages();
      }
    } catch (err) {
      this.context.api.showErrorNotification('Failed to init collection', err);
    }
  }

  private refreshImages() {
    this.nextState.imageTime = Date.now();
  }
}

export default StartPage as React.ComponentClass<IStartPageProps>;
