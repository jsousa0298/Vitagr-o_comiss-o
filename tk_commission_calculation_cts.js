/**
 * @NApiVersion 2.1
 * @NModuleScope public
 */

define([],
    function () {
        return {
            CUSTOM_RECORDS: {
                CUSTOMER: {
                    ID: 'custrecord_tk_customer_ls',
                    RELATED_FIELDS: ['custrecord_tk_salesrep_ls', 'custrecord_tk_region_tx']
                },
                SALESREP: {
                    ID: 'custrecord_tk_salesrep_ls',
                    RELATED_FIELDS: ['custrecord_tk_customer_ls', 'custrecord_tk_region_tx']
                },
                REGION: {
                    ID: 'custrecord_tk_region_tx',
                    RELATED_FIELDS: ['custrecord_tk_customer_ls', 'custrecord_tk_salesrep_ls']
                },
                DATE: {
                    START: 'custrecord_tk_data_start_dt',
                    END: 'custrecord_tk_date_end_dt'
                }
            },
            TRANSACTION: {
                ENTITY: 'entity',
                SALESREP: 'salesrep',
                METHOD_CALCULATION: 'custbody_tk_method_calculating_com_ls',
                TRAN_DATE: 'trandate',
                ITEM_SUBLIST: {
                    ID: 'item',
                    FIELDS: {
                        ITEM_ID: 'item',
                        AMOUNT: 'amount',
                        COMMISSION_VALUE: 'custcol_tk_value_commission'
                    }
                }
            },
            COMMISSION: {
                RULES_RECORD: 'customrecord_tk_commission_rules',
                ITEM_COMMISSION_RECORD: 'customrecord_tk_itens_commission',
                LINK_FIELD: 'custrecord_tk_link_tk_commission_rules',
                ITEM_FIELD: 'custrecord_tk_item_commission',
                PERCENTAGE_FIELD: 'custrecord_tk_commission_percentage_pc'
            },
            VALIDATION: {
                REQUIRED_FIELDS: ['custrecord_tk_customer_ls', 'custrecord_tk_region_tx', 'custrecord_tk_salesrep_ls'],
                DATE_VALIDATION_MESSAGE: 'A data de início não pode ser maior que a data final.',
                REQUIRED_FIELDS_MESSAGE: 'Pelo menos um dos seguintes campos deve ser preenchido: Cliente, Região ou Representante de Vendas.'
            },
            REGION_MAPPING: {
                'DF': 3, 'GO': 3, 'MT': 3, 'MS': 3,  // Centro-Oeste
                'AL': 2, 'BA': 2, 'CE': 2, 'MA': 2, 'PB': 2, 'PE': 2, 'PI': 2, 'RN': 2, 'SE': 2,  // Nordeste
                'AC': 1, 'AP': 1, 'AM': 1, 'PA': 1, 'RO': 1, 'RR': 1, 'TO': 1,  // Norte
                'ES': 4, 'MG': 4, 'RJ': 4, 'SP': 4,  // Sudeste
                'PR': 5, 'RS': 5, 'SC': 5  // Sul
            }
        }
    }
);
