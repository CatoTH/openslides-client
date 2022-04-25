import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import { TranslateService } from '@ngx-translate/core';
import { MotionChangeRecommendationRepositoryService } from 'app/core/repositories/motions/motion-change-recommendation-repository.service';
import { ComponentServiceCollector } from 'app/core/ui-services/component-service-collector';
import { LineRange, ModificationType } from 'app/core/ui-services/diff.service';

import {
    BaseChangeRecommendationData,
    BaseChangeRecommendationDialogComponent
} from '../base/base-change-recommendation-dialog.component';

/**
 * Data that needs to be provided to the MotionChangeRecommendationComponent dialog
 */
export interface MotionChangeRecommendationDialogComponentData extends BaseChangeRecommendationData {
    lineRange: LineRange;
    firstLine: number;
}

/**
 * The dialog for creating and editing change recommendations from within the os-motion-detail-component.
 *
 * @example
 * ```ts
 * const data: MotionChangeRecommendationDialogComponentData = {
 *     editChangeRecommendation: false,
 *     newChangeRecommendation: true,
 *     lineRange: lineRange,
 *     changeReco: this.changeRecommendation,
 * };
 * this.dialogService.open(MotionChangeRecommendationDialogComponent, {
 *      height: '400px',
 *      width: '600px',
 *      data: data,
 * });
 * ```
 *
 */
@Component({
    selector: `os-motion-change-recommendation`,
    templateUrl: `./motion-change-recommendation-dialog.component.html`,
    styleUrls: [`./motion-change-recommendation-dialog.component.scss`]
})
export class MotionChangeRecommendationDialogComponent extends BaseChangeRecommendationDialogComponent<MotionChangeRecommendationDialogComponentData> {
    /**
     * The line range affected by this change recommendation
     */
    public lineRange: LineRange;

    /**
     * The replacement types for the radio group
     * @TODO translate
     */
    public replacementTypes = [
        {
            value: ModificationType.TYPE_REPLACEMENT,
            title: _(`Replacement`)
        },
        {
            value: ModificationType.TYPE_INSERTION,
            title: _(`Insertion`)
        },
        {
            value: ModificationType.TYPE_DELETION,
            title: _(`Deletion`)
        }
    ];

    public constructor(
        componentServiceCollector: ComponentServiceCollector,
        protected translate: TranslateService,
        @Inject(MAT_DIALOG_DATA) public data: MotionChangeRecommendationDialogComponentData,
        formBuilder: FormBuilder,
        repo: MotionChangeRecommendationRepositoryService,
        dialogRef: MatDialogRef<MotionChangeRecommendationDialogComponent>
    ) {
        super(componentServiceCollector, translate, data, formBuilder, repo, dialogRef);
    }

    /**
     * Creates the forms for the Motion and the MotionVersion
     */
    protected createForm(): void {
        this.contentForm = this.formBuilder.group({
            text: [this.changeReco.text, Validators.required],
            type: [this.changeReco.type, Validators.required],
            public: [!this.changeReco.internal]
        });
    }

    protected initializeDialogData(): void {
        super.initializeDialogData();
        this.lineRange = this.data.lineRange;
    }

    protected async createChangeRecommendation(): Promise<void> {
        await this.repo.create(
            {
                ...this.changeReco,
                ...this.contentForm.value,
                internal: !this.contentForm.value.public
            },
            this.data.firstLine
        );
    }
}
