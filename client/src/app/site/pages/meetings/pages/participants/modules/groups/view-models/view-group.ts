import { ViewModelRelations } from 'src/app/site/base/base-view-model';
import { BaseHasMeetingUsersViewModel } from 'src/app/site/pages/meetings/base/base-has-meeting-user-view-model';

import { Permission } from '../../../../../../../../domain/definitions/permission';
import { permissionChildren } from '../../../../../../../../domain/definitions/permission-relations';
import { Group } from '../../../../../../../../domain/models/users/group';
import { HasMeeting } from '../../../../../view-models/has-meeting';
import { ViewMeeting } from '../../../../../view-models/view-meeting';
import { ViewChatGroup } from '../../../../chat/view-models/view-chat-group';
import { ViewMediafile } from '../../../../mediafiles/view-models/view-mediafile';
import { ViewMotionCommentSection } from '../../../../motions/modules/comments/view-models/view-motion-comment-section';
import { ViewPoll } from '../../../../polls/view-models/view-poll';

export class ViewGroup extends BaseHasMeetingUsersViewModel<Group> {
    public static COLLECTION = Group.COLLECTION;

    public get group(): Group {
        return this._model;
    }

    public hasPermission(perm: Permission): boolean {
        return (
            this.isAdminGroup ||
            this.permissions?.some(permission => permission === perm || permissionChildren[permission]?.includes(perm))
        );
    }
}
interface IGroupRelations {
    default_group_for_meeting: ViewMeeting;
    admin_group_for_meeting: ViewMeeting;
    meeting_mediafile_access_groups: ViewMediafile[];
    meeting_mediafile_inherited_access_groups: ViewMediafile[];
    read_comment_sections: ViewMotionCommentSection[];
    write_comment_sections: ViewMotionCommentSection[];
    read_chat_groups: ViewChatGroup[];
    write_chat_groups: ViewChatGroup[];
    polls: ViewPoll[];
    used_as_motion_poll_default?: ViewMeeting;
    used_as_assignment_poll_default?: ViewMeeting;
    used_as_topic_poll_default?: ViewMeeting;
}
export interface ViewGroup extends Group, ViewModelRelations<IGroupRelations>, HasMeeting {}
