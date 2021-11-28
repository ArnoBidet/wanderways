import { GameModeMetaData } from "../../services/game-mode-specific/game-mode-mode-meta-data.interface";

export class GameModeType{
    
    public static readonly GAME_CONSULT : GameModeMetaData = {
        game_mode_identifier:"GAME_CONSULT",
        game_mode_name : "Consultation",
        game_mode_rules : "Consultez librement les données de la carte."
    }
    public static readonly GAME_INPUT : GameModeMetaData = {
        game_mode_identifier:"GAME_INPUT",
        game_mode_name : "Saisie clavier - Contre la montre",
        game_mode_rules : "Tapez l'ensemble des valeurs avant la fin du temps !"
    }

    public static readonly GAME_LISTE : GameModeMetaData[] = [
        GameModeType.GAME_CONSULT,
        GameModeType.GAME_INPUT
    ];


    public static isValidType(game_mode_identifier : string) : boolean{
        return GameModeType.GAME_LISTE.find(value =>  value.game_mode_identifier == game_mode_identifier ) != undefined;
    }

    /**
     * Allows to get the valid instance of final data from the type identifier
     * @param type_identifier : The type identifier
     * @returns The corresponding type
     */
    public static getTypeFromIdentifier(type_identifier : string) : GameModeMetaData | undefined {
        return GameModeType.GAME_LISTE.find(value => value.game_mode_identifier == type_identifier);
    }
}