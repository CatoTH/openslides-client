import { Directive, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { Fqid } from 'src/app/domain/definitions/key-types';
import { Identifiable } from 'src/app/domain/interfaces';
import { BaseModel } from 'src/app/domain/models/base/base-model';
import {
    LOWEST_VOTE_VALUE,
    PollClassType,
    PollMethod,
    PollType,
    VOTE_UNDOCUMENTED,
    VoteKey,
    VoteValue,
    VoteValueVerbose
} from 'src/app/domain/models/poll';
import { Option } from 'src/app/domain/models/poll/option';
import { ViewPoll } from 'src/app/site/pages/meetings/pages/polls';
import { BaseUiComponent } from 'src/app/ui/base/base-ui-component';
import { OneOfValidator } from 'src/app/ui/modules/user-components';

import { BasePollFormComponent } from '../components/base-poll-form/base-poll-form.component';

export interface OptionsObject {
    fqid?: Fqid; //Obligatory if optionTypeText===false
    text?: string; //Obligatory if optionTypeText===true
    content_object?: BaseModel;
}

export interface OptionsObjectForText {
    text: string;
}

/**
 * A dialog for updating the values of a poll.
 */
@Directive()
export abstract class BasePollDialogComponent extends BaseUiComponent implements OnInit {
    public dialogVoteForm!: FormGroup;

    /**
     * Behaviorsubject for the view:
     * Is fed with current keys for the options subgroup of dialogVoteForm upon update.
     */
    public dialogVoteFormOptionKeysSubject = new BehaviorSubject<string[]>([]);

    public publishImmediately: boolean = false;

    /**
     * If the options of the finished poll should hold text instead of content_object_id,
     * this variable should be changed to true in the constructor.
     */
    protected optionTypeText = false;

    public voteValueVerbose = VoteValueVerbose;

    public pollClassType = PollClassType;

    /**
     * The summary values that will have fields in the dialog
     */
    public readonly sumValues: VoteKey[] = [`votesvalid`, `votesinvalid`, `votescast`];

    /**
     * vote entries for each option in this component. Is empty if method
     * requires one vote per candidate
     */
    public analogVoteFields: VoteValue[] = [];

    public get isAnalogPoll(): boolean {
        if (!this.pollForm) {
            return false;
        }
        return this.pollForm.contentForm.get(`type`)!.value === PollType.Analog || false;
    }

    @ViewChild(BasePollFormComponent, { static: true })
    protected pollForm: BasePollFormComponent | null = null;

    protected _options: OptionsObject[] = [];

    public get options(): OptionsObject[] {
        return this._options;
    }

    public get formsValid(): boolean {
        if (!this.pollForm) {
            return false;
        }
        return this.pollForm.contentForm.valid && this.dialogVoteForm?.valid;
    }

    public constructor(
        public dialogRef: MatDialogRef<BasePollDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public pollData: ViewPoll,
        protected formBuilder: FormBuilder
    ) {
        super();
        this.addKeyListener();
    }

    public ngOnInit(): void {
        this.onBeforeInit();
        this.createOptions();
        this.triggerUpdate();
    }

    private addKeyListener(): void {
        if (this.dialogRef) {
            this.dialogRef.keydownEvents().subscribe((event: KeyboardEvent) => {
                if (event.key === `Enter` && event.shiftKey) {
                    this.submitPoll();
                }

                if (event.key === `Escape`) {
                    this.dialogRef.close();
                }
            });
        }
    }

    /**
     * Submits the values from dialog.
     */
    public submitPoll(): void {
        const pollForm = this.pollForm?.getValues();
        const voteForm = this.dialogVoteForm.value;
        const payload: any = { ...pollForm, ...voteForm, publish_immediately: this.publishImmediately };
        payload.options = this.getOptions(voteForm.options);
        this.dialogRef.close(payload);
    }

    /**
     * Handles the state-change of the checkbox `Publish immediately`.
     *
     * If it is checked, at least one of the fields have to be filled.
     *
     * @param checked The next state.
     */
    public publishStateChanged(checked: boolean): void {
        if (checked) {
            this.dialogVoteForm.setValidators(OneOfValidator.validation(Object.keys(this.dialogVoteForm.controls)));
        } else {
            this.dialogVoteForm.setValidators(null);
        }
    }

    public getVoteData(): object | undefined {
        if (this.isVoteDataEmpty(this.dialogVoteForm.value)) {
            return undefined;
        }
        return this.replaceEmptyValues(this.dialogVoteForm.value);
    }

    /**
     * @return Must return BaseModel in case of object-based options (optionTypeText===false)
     * and string in case of text-based options (optionTypeText===true)
     */
    protected abstract getContentObjectsForOptions(): BaseModel[] | { text: string }[];
    protected abstract getAnalogVoteFields(): VoteValue[];
    protected onBeforeInit(): void {}

    protected triggerUpdate(): void {
        this.analogVoteFields = this.getAnalogVoteFields();
        this.createDialog();
    }

    /**
     * reverses the replacement of empty values by VOTE_UNDOCUMENTED; replaces each
     * VOTE_UNDOCUMENTED with null
     *
     * @param voteData the vote data
     */
    protected undoReplaceEmptyValues(voteData: object): object {
        return this.replaceEmptyValues(voteData, true);
    }

    /**
     * check recursively whether the given vote data object is empty, meaning all values would
     * be VOTE_UNDOCUMENTED when sent
     *
     * @param voteData the (partial) vote data
     */
    private isVoteDataEmpty(voteData: object): boolean {
        return Object.values(voteData).every(
            value => !value || (typeof value === `object` && this.isVoteDataEmpty(value))
        );
    }

    /**
     * iterates over the given data and returns a new object with all empty fields recursively
     * replaced with VOTE_UNDOCUMENTED
     * @param voteData the (partial) data
     */
    private replaceEmptyValues(voteData: any, undo: boolean = false): object {
        const result: any = {};
        for (const key of Object.keys(voteData)) {
            if (typeof voteData[key] === `object` && voteData[key]) {
                result[key] = this.replaceEmptyValues(voteData[key], undo);
            } else {
                if (undo) {
                    result[key] = voteData[key] === VOTE_UNDOCUMENTED ? null : voteData[key];
                } else {
                    result[key] = !!voteData[key] ? voteData[key] : VOTE_UNDOCUMENTED;
                }
            }
        }
        return result;
    }

    private getOptions(options: any): (Partial<Option> & Identifiable)[] {
        const result: any[] = [];
        const optionKeys = Object.keys(options);
        for (let index = 0; index < optionKeys.length; ++index) {
            if (this.optionTypeText === false) {
                result.push({
                    ...options[optionKeys[index]],
                    id: this.pollData.poll?.option_ids[index],
                    content_object_id: optionKeys[index]
                });
            } else {
                result.push({
                    ...options[optionKeys[index]],
                    id: this.pollData.poll?.option_ids[index]
                });
            }
        }
        return result;
    }

    private createOptions(): void {
        if (this.pollData) {
            if (this.pollData instanceof ViewPoll) {
                this._options = this.pollData.options;
            } else if (this.optionTypeText === false) {
                this._options = this.getContentObjectsForOptions().map(
                    contentObject => ({
                        fqid: contentObject.fqid,
                        content_object: contentObject
                    }),
                    {}
                );
            } else {
                this._options = this.getContentObjectsForOptions();
            }
        }
    }

    /**
     * Create a form group for each option with the user id as key
     */
    private createOptionsForVoteForm(): { [key: string]: any } {
        if (this.optionTypeText === false) {
            //with content_object_id
            return this.options?.mapToObject(option => ({
                [option.fqid]: this.formBuilder.group(
                    // for each user, create a form group with a control for each valid input (Y, N, A)
                    this.analogVoteFields?.mapToObject(value => ({
                        [value]: [``, [Validators.min(LOWEST_VOTE_VALUE)]]
                    }))
                )
            }));
        } else {
            //with text
            //get a unique key
            let key = 0;
            return this.options?.mapToObject(option => {
                key++;
                return {
                    [key.toString(10)]: this.formBuilder.group(
                        // The text for the option
                        {
                            text: [[option.text], [Validators.required]],
                            // for each user, create a form group with a control for each valid input (Y, N, A)
                            ...this.analogVoteFields?.mapToObject(value => ({
                                [value]: [``, [Validators.min(LOWEST_VOTE_VALUE)]]
                            }))
                        }
                    )
                };
            });
        }
    }

    /**
     * Pre-executed method to initialize the dialog-form depending on the poll-method.
     */
    private createDialog(): void {
        if (this._options) {
            this.dialogVoteForm = this.formBuilder.group({
                options: this.formBuilder.group(
                    // create a form group for each option with the user id as key
                    this.createOptionsForVoteForm()
                ),
                amount_global_yes: [``, [Validators.min(LOWEST_VOTE_VALUE)]],
                amount_global_no: [``, [Validators.min(LOWEST_VOTE_VALUE)]],
                amount_global_abstain: [``, [Validators.min(LOWEST_VOTE_VALUE)]],
                // insert all used global fields
                ...this.sumValues?.mapToObject(sumValue => ({
                    [sumValue]: [``, [Validators.min(LOWEST_VOTE_VALUE)]]
                }))
            });
            this.updateDialogVoteFormOptionKeysSubject();
            setTimeout(() => {
                if (this.isAnalogPoll && this.pollData instanceof ViewPoll) {
                    this.updateDialogVoteForm(this.pollData);
                }
            });
        }
    }

    private updateDialogVoteForm(data: Partial<ViewPoll>): void {
        const update: any = {
            options: {},
            votesvalid: data.votesvalid,
            votesinvalid: data.votesinvalid,
            votescast: data.votescast,
            amount_global_yes: data.global_option?.yes,
            amount_global_no: data.global_option?.no,
            amount_global_abstain: data.global_option?.abstain
        };
        for (const option of data.options || []) {
            const votes: any = {};
            votes.Y = option.yes;
            if (data.pollmethod !== PollMethod.Y) {
                votes.N = option.no;
            }
            if (data.pollmethod === PollMethod.YNA) {
                votes.A = option.abstain;
            }
            update.options[option.fqid] = votes;
        }

        if (this.dialogVoteForm) {
            const result = this.undoReplaceEmptyValues(update);
            this.dialogVoteForm.patchValue(result);
        }
    }

    public get optionsFromVoteForm(): FormGroup | null {
        const dialogVoteFormControls = this.dialogVoteForm?.controls;
        if (dialogVoteFormControls && !!dialogVoteFormControls[`options`]) {
            return dialogVoteFormControls[`options`] as FormGroup;
        } else {
            return null;
        }
    }

    public updateDialogVoteFormOptionKeysSubject(): void {
        this.dialogVoteFormOptionKeysSubject.next(Object.keys(this.optionsFromVoteForm.controls));
    }
}