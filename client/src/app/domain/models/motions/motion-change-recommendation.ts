import { Id } from '../../definitions/key-types';
import { HasMeetingId } from '../../interfaces/has-meeting-id';
import { BaseModel } from '../base/base-model';
import { ModificationType } from './motions.constants';

/**
 * Representation of a motion change recommendation.
 * @ignore
 */
export class MotionChangeRecommendation extends BaseModel<MotionChangeRecommendation> {
    public static COLLECTION = `motion_change_recommendation`;

    public rejected!: boolean;
    public internal!: boolean;
    public type!: ModificationType;
    public other_description!: string;
    public line_from!: number;
    public line_to!: number;
    public text!: string;
    public creation_time!: string;

    public motion_id!: Id; // motion/change_recommendation_ids;

    public constructor(input?: any) {
        super(MotionChangeRecommendation.COLLECTION, input);
    }
}
export interface MotionChangeRecommendation extends HasMeetingId {}