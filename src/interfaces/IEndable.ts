export interface IEndable {
    /**
     * Indicate that the object is no longer used & clean up any internal stuff
     */
    end(): void;
}
