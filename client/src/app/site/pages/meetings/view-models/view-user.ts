import { User } from 'src/app/domain/models/users/user';
import { BaseViewModel } from 'src/app/site/base/base-view-model';

import { Id } from '../../../../domain/definitions/key-types';
import { ViewCommittee } from '../../organization/pages/committees';
import { ViewOrganization } from '../../organization/view-models/view-organization';
import { ViewGroup } from '../pages/participants/modules/groups/view-models/view-group';
import { ViewOption, ViewPoll, ViewVote } from '../pages/polls';
import { DelegationType } from './delegation-type';
import { ViewMeeting } from './view-meeting';
import { ViewMeetingUser } from './view-meeting-user';

/**
 * Form control names that are editable for all users even if they have no permissions to manage users.
 */
export const PERSONAL_FORM_CONTROLS = [`gender`, `username`, `email`, `about_me`, `pronoun`];

export class ViewUser extends BaseViewModel<User> /* implements Searchable */ {
    public static COLLECTION = User.COLLECTION;

    public get user(): User {
        return this._model;
    }

    public get isLastEmailSend(): boolean {
        return !!this.last_email_send;
    }

    public get isLastLogin(): boolean {
        return !!this.last_login;
    }

    public get hasEmail(): boolean {
        return !!this.email;
    }

    public get isCommitteeManager(): boolean {
        return !!this.committee_managements();
    }

    public get numberOfMeetings(): number {
        return this.meeting_ids.length;
    }

    public get name(): string {
        if (this.user && this.getName) {
            return this.getName();
        } else {
            return ``;
        }
    }

    public get short_name(): string {
        if (this.user && this.getShortName) {
            return this.getShortName();
        } else {
            return ``;
        }
    }

    public get full_name(): string {
        if (this.user && this.getFullName) {
            return this.getFullName();
        } else {
            return ``;
        }
    }

    public get delegationType(): DelegationType {
        if (this.isVoteRightDelegated) {
            return DelegationType.Transferred;
        } else if (this.hasVoteRightFromOthers()) {
            return DelegationType.Received;
        }
        return DelegationType.Neither;
    }

    public get meeting_ids(): Id[] {
        return this.user.meeting_ids || [];
    }

    public get isInActiveMeeting(): boolean {
        return this.meetings.some(meeting => meeting.isActive);
    }

    public get isInArchivedMeeting(): boolean {
        return this.meetings.some(meeting => meeting.isArchived);
    }

    // Will be set by the repository
    public getName!: () => string;
    public getShortName!: () => string;
    public getFullName!: () => string;
    public getLevelAndNumber!: () => string;

    /**
     * A function which will return the id of the currently active meeting, if one is chosen.
     *
     * @returns The id of the currently active meeting
     */
    public getEnsuredActiveMeetingId!: () => Id;

    /**
     * @param meetingId The meeting id. If not provided, tha active meeting id is used.
     * If there is no active meeting, an error will be thrown.
     * @returns if the user is present in the given meeting
     */
    public isPresentInMeeting(meetingId?: Id): boolean {
        if (!meetingId) {
            meetingId = this.getEnsuredActiveMeetingId();
        }
        return this.is_present_in_meeting_ids?.includes(meetingId) || false;
    }

    public get hasMultipleMeetings(): boolean {
        return this.meeting_ids?.length !== 1; // In case of `0` it should not return `true`
    }

    public get onlyMeeting(): Id {
        const meetingAmount = this.meeting_ids?.length || 0;
        if (meetingAmount === 1) {
            return this.meeting_ids[0];
        } else if (meetingAmount > 1) {
            throw new Error(`User has multiple meetings`);
        } else if (meetingAmount === 0) {
            throw new Error(`User has no meetings at all`);
        } else {
            throw new Error(`Cannot identify meetings`);
        }
    }

    public get allGroups(): ViewGroup[] {
        return this.meeting_users.flatMap(user => user.groups);
    }

    public hasVoteRightFromOthers(meetingId?: Id): boolean {
        return this.vote_delegations_from_ids(meetingId || this.getEnsuredActiveMeetingId())?.length > 0;
    }

    public delegationName(meetingId?: Id): string | undefined {
        return this.vote_delegated_to(meetingId || this.getEnsuredActiveMeetingId())?.getFullName();
    }

    public speaker_ids(meetingId?: Id): Id[] {
        return this.getMeetingUser(meetingId)?.speaker_ids;
    }

    public personal_note_ids(meetingId?: Id): Id[] {
        return this.getMeetingUser(meetingId)?.personal_note_ids;
    }

    public supported_motion_ids(meetingId?: Id): Id[] {
        return this.getMeetingUser(meetingId)?.supported_motion_ids;
    }

    public submitted_motion_ids(meetingId?: Id): Id[] {
        return this.getMeetingUser(meetingId)?.submitted_motion_ids;
    }

    public assignment_candidate_ids(meetingId?: Id): Id[] {
        return this.getMeetingUser(meetingId)?.assignment_candidate_ids;
    }

    public chat_message_ids(meetingId?: Id): Id[] {
        return this.getMeetingUser(meetingId)?.chat_message_ids;
    }

    public vote_delegated_to_id(meetingId?: Id): Id {
        return this.getMeetingUser(meetingId)?.vote_delegated_to_id;
    }

    public vote_delegations_from_ids(meetingId?: Id): Id[] {
        return this.getMeetingUser(meetingId)?.vote_delegations_from_ids;
    }

    public vote_weight(meetingId?: Id): number {
        return this.getMeetingUser(meetingId)?.vote_weight;
    }

    public number(meetingId?: Id): string {
        try {
            return this.getMeetingUser(meetingId)?.number;
        } catch (e) {
            return this.user.default_number;
        }
    }

    public structure_level(meetingId?: Id): string {
        try {
            return this.getMeetingUser(meetingId)?.structure_level;
        } catch (e) {
            return this.user.default_structure_level;
        }
    }

    public comment(meetingId?: Id): string {
        return this.getMeetingUser(meetingId)?.comment;
    }

    public about_me(meetingId?: Id): string {
        return this.getMeetingUser(meetingId)?.about_me;
    }

    public groups(meetingId?: Id): ViewGroup[] {
        return this.getMeetingUser(meetingId)?.groups;
    }

    public group_ids(meetingId?: Id): number[] {
        return this.getMeetingUser(meetingId)?.group_ids;
    }

    public get isVoteWeightOne(): boolean {
        return (!this.getEnsuredActiveMeetingId() ? this.default_vote_weight : this.vote_weight()) === 1;
    }

    public get isVoteRightDelegated(): boolean {
        return !!this.vote_delegated_to_id(this.getEnsuredActiveMeetingId());
    }

    public get voteWeight(): number {
        return this.vote_weight() ?? this.default_vote_weight;
    }

    public get isVoteCountable(): boolean {
        const delegate = this.vote_delegated_to(this.getEnsuredActiveMeetingId());
        if (!delegate) {
            return this.isPresentInMeeting();
        }
        return delegate.isPresentInMeeting();
    }
    // ### block end.

    public override getDetailStateUrl(): string {
        return `/${this.getActiveMeetingId()}/users/${this.id}`;
    }

    public canVoteFor(user: ViewUser | null): boolean {
        if (!user) {
            return false;
        }
        return this.vote_delegations_from_ids().includes(user.id);
    }

    public getMeetingUser(meetingId?: Id): ViewMeetingUser {
        return this.meeting_users.find(user => user.meeting_id === (meetingId || this.getEnsuredActiveMeetingId()));
    }
}
type UserManyStructuredRelation<Result> = (arg?: Id) => Result[];
interface IUserRelations {
    is_present_in_meetings: ViewMeeting[];
    committees: ViewCommittee[];
    meetings: ViewMeeting[];
    organization: ViewOrganization;
    meeting_users: ViewMeetingUser[];
    committee_managements: UserManyStructuredRelation<ViewCommittee>;
    // groups: UserManyStructuredRelation<ViewGroup>;
    poll_voted: UserManyStructuredRelation<ViewPoll>;
    options: UserManyStructuredRelation<ViewOption>;
    votes: UserManyStructuredRelation<ViewVote>;
    vote_delegated_to: (arg?: number) => ViewUser;
    vote_delegations_from: UserManyStructuredRelation<ViewUser>;
}

export interface ViewUser extends User, IUserRelations {}
