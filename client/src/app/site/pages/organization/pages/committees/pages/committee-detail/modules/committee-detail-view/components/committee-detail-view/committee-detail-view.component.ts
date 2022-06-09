import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { Id } from 'src/app/domain/definitions/key-types';
import { CML, OML } from 'src/app/domain/definitions/organization-permission';
import { ViewMeeting } from 'src/app/site/pages/meetings/view-models/view-meeting';
import { OperatorService } from 'src/app/site/services/operator.service';
import { BaseUiComponent } from 'src/app/ui/base/base-ui-component';
import { PromptService } from 'src/app/ui/modules/prompt-dialog';

import { CommitteeControllerService } from '../../../../../../services/committee-controller.service';
import { ViewCommittee } from '../../../../../../view-models/view-committee';

const FORWARD_LABEL = _(`Forward motions to`);
const RECEIVE_LABEL = _(`Receive motions from`);

@Component({
    selector: `os-committee-detail-view`,
    templateUrl: `./committee-detail-view.component.html`,
    styleUrls: [`./committee-detail-view.component.scss`]
})
export class CommitteeDetailViewComponent extends BaseUiComponent {
    public readonly OML = OML;

    public forwardLabel = FORWARD_LABEL;
    public receiveLabel = RECEIVE_LABEL;

    public committeeId: Id | null = null;

    public currentCommitteeObservable: Observable<ViewCommittee | null> | null = null;

    public get canManageMeetingsInCommittee(): boolean {
        return this.operator.hasCommitteePermissionsNonAdminCheck(this.committeeId, CML.can_manage);
    }

    public get canManageCommittee(): boolean {
        return this.operator.hasCommitteePermissions(this.committeeId, CML.can_manage);
    }

    public get canManageUsers(): boolean {
        return this.operator.hasOrganizationPermissions(OML.can_manage_users);
    }

    public constructor(
        private translate: TranslateService,
        private route: ActivatedRoute,
        private router: Router,
        private operator: OperatorService,
        private committeeRepo: CommitteeControllerService,
        private promptService: PromptService
    ) {
        super();
        this.subscriptions.push(
            this.route.params.subscribe(params => {
                if (params) {
                    this.committeeId = Number(params[`committeeId`]);
                    this.currentCommitteeObservable = this.committeeRepo.getViewModelObservable(this.committeeId);
                }
            })
        );
    }

    public onCreateMeeting(): void {
        this.router.navigate([`meeting`, `create`], { relativeTo: this.route });
    }

    public async onDeleteCommittee(committee: ViewCommittee): Promise<void> {
        const title = this.translate.instant(`Are you sure you want to delete this committee?`);
        const content = committee.name;

        const confirmed = await this.promptService.open(title, content);
        if (confirmed) {
            await this.committeeRepo.delete(committee);
            this.router.navigate([`./committees/`]);
        }
    }

    public getMemberAmount(committee: ViewCommittee): number {
        return committee.user_ids?.length || 0;
    }

    public getMeetingsSorted(committee: ViewCommittee): ViewMeeting[] {
        return committee.meetings.sort((a, b) => b.end_time - a.end_time);
    }
}